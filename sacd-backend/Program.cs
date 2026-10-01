using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using System.Text.Json.Serialization;
using sacd_backend.Data;
using sacd_backend.Services;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<SacdDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        x => x.UseNetTopologySuite()));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

builder.Services.AddScoped<IDenunciaService, DenunciaService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IFotoService, FotoService>();

builder.Services.AddHostedService<sacd_backend.Services.ArquivamentoCleanupService>();

builder.Services.AddAuthentication("Firebase")
    .AddScheme<AuthenticationSchemeOptions, FirebaseAuthenticationHandler>("Firebase", null);

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Cidadao", policy => policy.RequireRole("cidadao", "fiscal", "gerenciador", "administrador", "tecnico"));
    options.AddPolicy("Fiscal", policy => policy.RequireRole("fiscal", "gerenciador", "administrador", "tecnico"));
    options.AddPolicy("Gerenciador", policy => policy.RequireRole("gerenciador", "administrador", "tecnico"));
    options.AddPolicy("Administrador", policy => policy.RequireRole("administrador", "tecnico"));
    options.AddPolicy("Tecnico", policy => policy.RequireRole("tecnico"));
});

// Caminho da credencial do Firebase Admin (fora do Git). Pode ser trocado via
// variável de ambiente Firebase__CredentialsPath.
var firebaseCredentialsPath = builder.Configuration["Firebase:CredentialsPath"] ?? "firebase-service-account.json";
if (!File.Exists(firebaseCredentialsPath))
{
    throw new FileNotFoundException(
        $"Credencial do Firebase não encontrada em '{firebaseCredentialsPath}'. Veja a seção 'Configuração' do README.");
}
FirebaseApp.Create(new AppOptions
{
    Credential = GoogleCredential.FromFile(firebaseCredentialsPath)
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
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

app.UseCors("AllowAll");

var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
