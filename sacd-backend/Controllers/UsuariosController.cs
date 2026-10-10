using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using sacd_backend.Models;
using sacd_backend.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;
using sacd_backend.Seguranca;

namespace sacd_backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsuariosController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;
        private readonly IVerificadorToken _verificador;

        public UsuariosController(IUsuarioService usuarioService, IVerificadorToken verificador)
        {
            _usuarioService = usuarioService;
            _verificador = verificador;
        }

        [HttpGet("me")]
        [Authorize(Policy = "Cidadao")]
        public async Task<ActionResult<Usuario>> GetMe()
        {
            var firebaseUid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(firebaseUid))
            {
                return Unauthorized();
            }

            var usuario = await _usuarioService.GetUsuarioByFirebaseUidAsync(firebaseUid);
            if (usuario == null)
            {
                return NotFound();
            }

            return Ok(usuario);
        }

        [HttpGet]
        [Authorize(Policy = "Administrador")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetUsuarios()
        {
            return Ok(await _usuarioService.GetAllUsuariosAsync());
        }

        /// <summary>DTO do cadastro: só o nome vem do cliente. Uid e e-mail saem do token do Firebase.</summary>
        public sealed record NovoUsuarioRequest(string Nome);

        /// <summary>
        /// Cria o perfil do usuário logo depois do cadastro no Firebase.
        /// Não usa o esquema de autenticação (o usuário ainda não existe no banco), então
        /// verifica o token aqui mesmo: uid e e-mail vêm do token, nunca do corpo da requisição.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<Usuario>> PostUsuario([FromBody] NovoUsuarioRequest request)
        {
            var token = TokenBearer.Extrair(Request);
            if (token is null) return Unauthorized(new { message = "Token ausente." });

            var verificado = await _verificador.VerificarAsync(token, HttpContext.RequestAborted);
            if (verificado is null) return Unauthorized(new { message = "Token inválido ou expirado." });
            if (string.IsNullOrWhiteSpace(verificado.Email))
                return BadRequest(new { message = "A conta precisa de um e-mail." });

            var nome = request.Nome?.Trim() ?? "";
            if (nome.Length is < 2 or > 120)
                return BadRequest(new { message = "Informe um nome entre 2 e 120 caracteres." });

            if (await _usuarioService.GetUsuarioByFirebaseUidAsync(verificado.Uid) is not null)
                return Conflict(new { message = "Usuário já cadastrado." });

            var usuario = new Usuario
            {
                Nome = nome,
                Email = verificado.Email,
                FirebaseUid = verificado.Uid,
                Role = "cidadao", // todo cadastro novo é cidadão; só o técnico promove
                Ativo = true,
                CreatedAt = DateTime.UtcNow,
            };

            await _usuarioService.AddUsuarioAsync(usuario);
            return CreatedAtAction("GetMe", new { }, usuario);
        }

        [HttpPut("permissao/{id}")]
        [Authorize(Policy = "Tecnico")]
        public async Task<IActionResult> AlterarPermissao(int id, [FromBody] string novaRole)
        {
            var rolesValidas = new[] { "cidadao", "fiscal", "gerenciador", "administrador", "tecnico" };

            if (string.IsNullOrWhiteSpace(novaRole) || !rolesValidas.Contains(novaRole))
            {
                return BadRequest("Role inválida.");
            }

            var usuario = await _usuarioService.GetUsuarioByIdAsync(id);
            if (usuario == null)
            {
                return NotFound();
            }

            usuario.Role = novaRole;
            await _usuarioService.UpdateUsuarioAsync(usuario);
            return NoContent();
        }
    }
}
