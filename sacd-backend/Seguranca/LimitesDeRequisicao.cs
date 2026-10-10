using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace sacd_backend.Seguranca
{
    /// <summary>
    /// Rate limit em TODOS os endpoints da API (regra fixa dos projetos).
    /// O contador é por usuário autenticado (uid do Firebase) ou, sem login, por IP.
    /// Os limites ficam em memória: com mais de uma instância da API, mover para Redis.
    /// </summary>
    public static class LimitesDeRequisicao
    {
        public enum Categoria { Cadastro, Upload, Escrita, Leitura }

        /// <summary>Limite e janela de cada categoria.</summary>
        public static (int Limite, TimeSpan Janela) Regra(Categoria c) => c switch
        {
            Categoria.Cadastro => (5, TimeSpan.FromMinutes(15)), // criação de conta: rígido, por IP
            Categoria.Upload => (10, TimeSpan.FromMinutes(1)),
            Categoria.Escrita => (30, TimeSpan.FromMinutes(1)),
            _ => (120, TimeSpan.FromMinutes(1)),
        };

        public static Categoria Classificar(string metodo, string caminho)
        {
            var p = caminho.TrimEnd('/').ToLowerInvariant();
            if (HttpMethods.IsPost(metodo) && p == "/api/usuarios") return Categoria.Cadastro;
            if (HttpMethods.IsPost(metodo) && p.EndsWith("/fotos")) return Categoria.Upload;
            if (HttpMethods.IsGet(metodo) || HttpMethods.IsHead(metodo) || HttpMethods.IsOptions(metodo)) return Categoria.Leitura;
            return Categoria.Escrita;
        }

        /// <summary>Chave de quem está fazendo a requisição. Cadastro é sempre por IP (ainda não há usuário).</summary>
        public static string Chave(HttpContext http, Categoria categoria)
        {
            var ip = http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
            if (categoria == Categoria.Cadastro) return $"ip:{ip}";
            var uid = http.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return uid is null ? $"ip:{ip}" : $"uid:{uid}";
        }

        public static IServiceCollection AddLimitesDeRequisicao(this IServiceCollection services)
        {
            services.AddRateLimiter(o =>
            {
                o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                o.OnRejected = async (ctx, ct) =>
                {
                    if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var espera))
                        ctx.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(espera.TotalSeconds)).ToString();
                    await ctx.HttpContext.Response.WriteAsJsonAsync(
                        new { message = "Muitas requisições. Aguarde um pouco e tente de novo." }, ct);
                };
                o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http =>
                {
                    var categoria = Classificar(http.Request.Method, http.Request.Path.Value ?? "/");
                    var (limite, janela) = Regra(categoria);
                    return RateLimitPartition.GetFixedWindowLimiter(
                        $"{categoria}:{Chave(http, categoria)}",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = limite,
                            Window = janela,
                            QueueLimit = 0,
                            AutoReplenishment = true,
                        });
                });
            });
            return services;
        }
    }

    /// <summary>Cabeçalhos HTTP de segurança em todas as respostas da API.</summary>
    public static class CabecalhosDeSeguranca
    {
        public static IApplicationBuilder UseCabecalhosDeSeguranca(this IApplicationBuilder app) =>
            app.Use(async (ctx, next) =>
            {
                var h = ctx.Response.Headers;
                h["X-Content-Type-Options"] = "nosniff";
                h["X-Frame-Options"] = "DENY";
                h["Referrer-Policy"] = "strict-origin-when-cross-origin";
                h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)";
                await next();
            });
    }
}
