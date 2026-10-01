using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using sacd_backend.Models;
using sacd_backend.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;

namespace sacd_backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsuariosController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;

        public UsuariosController(IUsuarioService usuarioService)
        {
            _usuarioService = usuarioService;
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

        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<Usuario>> PostUsuario(Usuario usuario)
        {
            usuario.Role = "cidadao";
            usuario.Ativo = true;
            usuario.CreatedAt = DateTime.UtcNow;

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
