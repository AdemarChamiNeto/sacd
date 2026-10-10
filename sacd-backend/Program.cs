using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using System.Text.Json.Serialization;
using sacd_backend.Data;
using sacd_backend.Services;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.HttpOverrides;
using sacd_backend.Seguranca;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// A connection string vem de variável de ambiente (ConnectionStrings__DefaultConnection).
// Em desenvolvimento ela está no appsettings.Development.json; nunca no appsettings.json.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Defina a variável de ambiente ConnectionStrings__DefaultConnection (veja .env.example).");

builder.Services.AddDbContext<SacdDbContext>(options =>
    options.UseNpgsql(connectionString, x => x.UseNetTopologySuite()));

// CORS: em produção o front e a API ficam no mesmo domínio (o Nginx repassa /api),
// então nenhuma origem é liberada. Em desenvolvimento libera o Vite (appsettings.Development.json).
var origensPermitidas = builder.Configuration.GetSection("Cors:Origens").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Front", policy =>
    {
        if (origensPermitidas.Length > 0)
            policy.WithOrigins(origensPermitidas).AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddLimitesDeRequisicao();

// Atrás do Nginx/Caddy: usa o IP real do visitante (X-Forwarded-For) no rate limit.
// Seguro porque a API não fica exposta direto na internet (só o proxy fala com ela).
// Proxy__Saltos = quantos proxies ficam na frente da API: 1 em dev (Nginx), 2 em produção (Caddy → Nginx).
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.ForwardLimit = builder.Configuration.GetValue("Proxy:Saltos", 1);
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

builder.Services.AddSingleton<IVerificadorToken, VerificadorTokenFirebase>();
builder.Services.AddScoped<IDenunciaService, DenunciaService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IFotoService, FotoService>();

builder.Services.AddHostedService<sacd_backend.Services.ArquivamentoCleanupService>();

builder.Services.AddAuthentication("Firebase")
    .AddScheme<AuthenticationSchemeOptions, FirebaseAuthenticationHandler>("Firebase", null);

// 2FA obrigatório: toda policy exige que o login tenha usado o segundo fator (TOTP).
// Só dá para desligar por configuração (Auth__ExigirSegundoFator=false), por exemplo em testes locais.
var exigirSegundoFator = builder.Configuration.GetValue("Auth:ExigirSegundoFator", true);
void Papel(Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder policy, params string[] papeis)
{
    policy.RequireRole(papeis);
    if (exigirSegundoFator)
        policy.RequireClaim(FirebaseAuthenticationHandler.ClaimSegundoFator, "true");
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Cidadao", p => Papel(p, "cidadao", "fiscal", "gerenciador", "administrador", "tecnico"));
    options.AddPolicy("Fiscal", p => Papel(p, "fiscal", "gerenciador", "administrador", "tecnico"));
    options.AddPolicy("Gerenciador", p => Papel(p, "gerenciador", "administrador", "tecnico"));
    options.AddPolicy("Administrador", p => Papel(p, "administrador", "tecnico"));
    options.AddPolicy("Tecnico", p => Papel(p, "tecnico"));
});

// Credencial do Firebase Admin (fora do Git). Duas formas:
//  - Firebase__CredentialsJson: o conteúdo do JSON inteiro (bom para Render, Railway etc.);
//  - Firebase__CredentialsPath: caminho do arquivo (padrão: firebase-service-account.json).
var credencialJson = builder.Configuration["Firebase:CredentialsJson"];
GoogleCredential credencial;
if (!string.IsNullOrWhiteSpace(credencialJson))
{
    credencial = GoogleCredential.FromJson(credencialJson);
}
else
{
    var firebaseCredentialsPath = builder.Configuration["Firebase:CredentialsPath"] ?? "firebase-service-account.json";
    if (!File.Exists(firebaseCredentialsPath))
        throw new FileNotFoundException(
            $"Credencial do Firebase não encontrada em '{firebaseCredentialsPath}'. Veja a seção 'Configuração' do README.");
    credencial = GoogleCredential.FromFile(firebaseCredentialsPath);
}
FirebaseApp.Create(new AppOptions { Credential = credencial });

var app = builder.Build();

app.UseForwardedHeaders();
app.UseCabecalhosDeSeguranca();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Erro sem stack trace para o visitante; o detalhe fica só no log.
    app.UseExceptionHandler(e => e.Run(ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return ctx.Response.WriteAsJsonAsync(new { message = "Erro interno. Tente novamente." });
    }));
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<sacd_backend.Data.SacdDbContext>();
    var migLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS arquivada BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS dataarquivamento TIMESTAMP WITH TIME ZONE;
        ");
        migLogger.LogInformation("Migração de arquivamento aplicada com sucesso.");
    }
    catch (Exception ex)
    {
        migLogger.LogWarning(ex, "Aviso na migração (pode ser ignorado se colunas já existem).");
    }
}

app.UseCors("Front");

var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseRateLimiter();   // depois da autenticação: o limite é por usuário quando há login
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapControllers();

app.Run();
