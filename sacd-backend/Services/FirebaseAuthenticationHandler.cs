using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using sacd_backend.Seguranca;

namespace sacd_backend.Services
{
    /// <summary>
    /// Valida o ID token do Firebase em cada requisição e monta o usuário a partir do banco.
    /// O claim "mfa" diz se o login usou o segundo fator (2FA); as policies exigem esse claim.
    /// </summary>
    public class FirebaseAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string ClaimSegundoFator = "mfa";

        private readonly IUsuarioService _usuarioService;
        private readonly IVerificadorToken _verificador;

        public FirebaseAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            IUsuarioService usuarioService,
            IVerificadorToken verificador)
            : base(options, logger, encoder)
        {
            _usuarioService = usuarioService;
            _verificador = verificador;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var token = TokenBearer.Extrair(Request);
            if (token is null) return AuthenticateResult.NoResult();

            var verificado = await _verificador.VerificarAsync(token, Context.RequestAborted);
            if (verificado is null) return AuthenticateResult.Fail("Token inválido ou expirado.");

            var usuario = await _usuarioService.GetUsuarioByFirebaseUidAsync(verificado.Uid);
            if (usuario == null) return AuthenticateResult.Fail("Usuário não cadastrado.");
            if (!usuario.Ativo) return AuthenticateResult.Fail("Usuário desativado.");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.FirebaseUid),
                new Claim(ClaimTypes.Email, usuario.Email),
                new Claim(ClaimTypes.Role, usuario.Role),
                new Claim("Id", usuario.Id.ToString()),
                new Claim(ClaimSegundoFator, verificado.SegundoFator ? "true" : "false"),
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
    }
}
