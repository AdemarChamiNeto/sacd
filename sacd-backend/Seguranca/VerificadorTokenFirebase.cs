using FirebaseAdmin.Auth;
using Newtonsoft.Json.Linq;

namespace sacd_backend.Seguranca
{
    /// <summary>Dados confiáveis extraídos de um ID token do Firebase já verificado.</summary>
    public sealed record TokenVerificado(string Uid, string? Email, bool SegundoFator);

    /// <summary>Verifica o ID token do Firebase. Interface para poder testar sem o Firebase.</summary>
    public interface IVerificadorToken
    {
        /// <summary>Retorna null se o token for inválido ou expirado.</summary>
        Task<TokenVerificado?> VerificarAsync(string token, CancellationToken ct = default);
    }

    public sealed class VerificadorTokenFirebase : IVerificadorToken
    {
        private readonly ILogger<VerificadorTokenFirebase> _logger;
        public VerificadorTokenFirebase(ILogger<VerificadorTokenFirebase> logger) => _logger = logger;

        public async Task<TokenVerificado?> VerificarAsync(string token, CancellationToken ct = default)
        {
            try
            {
                // checkRevoked: true → token de conta desativada ou com sessão revogada é recusado
                var t = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token, checkRevoked: true, ct);
                t.Claims.TryGetValue("email", out var email);
                return new TokenVerificado(t.Uid, email?.ToString(), TemSegundoFator(t.Claims));
            }
            catch (FirebaseAuthException ex)
            {
                _logger.LogInformation("Token recusado: {Codigo}", ex.AuthErrorCode);
                return null;
            }
        }

        /// <summary>
        /// Quando o login usou 2FA, o Firebase põe no token:
        /// "firebase": { "sign_in_second_factor": "totp", ... }.
        /// </summary>
        public static bool TemSegundoFator(IReadOnlyDictionary<string, object> claims)
        {
            if (!claims.TryGetValue("firebase", out var firebase) || firebase is null) return false;
            var obj = firebase as JObject ?? JObject.FromObject(firebase);
            return !string.IsNullOrEmpty(obj.Value<string>("sign_in_second_factor"));
        }
    }

    /// <summary>Lê "Bearer xxx" do cabeçalho Authorization.</summary>
    public static class TokenBearer
    {
        public static string? Extrair(HttpRequest request)
        {
            var header = request.Headers.Authorization.ToString();
            return header.StartsWith("Bearer ", StringComparison.Ordinal) ? header["Bearer ".Length..].Trim() : null;
        }
    }
}
