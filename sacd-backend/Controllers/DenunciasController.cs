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
    public class DenunciasController : ControllerBase
    {
        private readonly IDenunciaService _denunciaService;
        private readonly IFotoService _fotoService;
        private readonly ILogger<DenunciasController> _logger;

        public DenunciasController(IDenunciaService denunciaService, IFotoService fotoService, ILogger<DenunciasController> logger)
        {
            _denunciaService = denunciaService;
            _fotoService = fotoService;
            _logger = logger;
        }

        [HttpGet]
        [Authorize(Policy = "Fiscal")]
        public async Task<ActionResult<IEnumerable<Denuncia>>> GetDenuncias([FromQuery] string status = null)
        {
            try
            {
                _logger.LogInformation("Buscando todas as denúncias");

                var denuncias = await _denunciaService.GetAllDenunciasAsync();

                if (!string.IsNullOrEmpty(status))
                {
                    denuncias = denuncias.Where(d => d.Status == status);
                }

                return Ok(denuncias);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar todas as denúncias");
                return StatusCode(500, new { message = "Erro ao buscar denúncias" });
            }
        }

        [HttpGet("minhas")]
        [Authorize(Policy = "Cidadao")]
        public async Task<ActionResult<IEnumerable<Denuncia>>> GetMinhasDenuncias([FromQuery] string status = null)
        {
            try
            {
                var userIdStr = User.FindFirst("Id")?.Value;
                
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                {
                    _logger.LogWarning("Usuário sem ID válido tentou acessar /minhas");
                    return Unauthorized(new { message = "Usuário não identificado" });
                }

                _logger.LogInformation($"Buscando denúncias do usuário {userId}");

                var denuncias = await _denunciaService.GetDenunciasByUsuarioIdAsync(userId);

                if (!string.IsNullOrEmpty(status))
                {
                    denuncias = denuncias.Where(d => d.Status == status);
                }

                return Ok(denuncias);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar denúncias do usuário");
                return StatusCode(500, new { message = "Erro ao buscar denúncias" });
            }
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "Cidadao")]
        public async Task<ActionResult<Denuncia>> GetDenuncia(int id)
        {
            try
            {
                var denuncia = await _denunciaService.GetDenunciaByIdAsync(id);

                if (denuncia == null)
                {
                    return NotFound(new { message = "Denúncia não encontrada" });
                }

                var userIdStr = User.FindFirst("Id")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                if (userRole == "cidadao" && denuncia.IdUsuario.ToString() != userIdStr)
                {
                    _logger.LogWarning($"Tentativa de acesso não autorizado à denúncia {id}");
                    return Forbid();
                }

                return Ok(denuncia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao buscar denúncia {id}");
                return StatusCode(500, new { message = "Erro ao buscar denúncia" });
            }
        }

        [HttpPost]
        [Authorize(Policy = "Cidadao")]
        public async Task<ActionResult<Denuncia>> PostDenuncia([FromBody] CreateDenunciaRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Descricao))
                {
                    return BadRequest(new { message = "Descrição é obrigatória" });
                }

                if (request.Descricao.Length > 1000)
                {
                    return BadRequest(new { message = "Descrição muito longa (máximo 1000 caracteres)" });
                }

                if (request.Latitude < -90 || request.Latitude > 90)
                {
                    return BadRequest(new { message = "Latitude inválida" });
                }

                if (request.Longitude < -180 || request.Longitude > 180)
                {
                    return BadRequest(new { message = "Longitude inválida" });
                }

                var userIdStr = User.FindFirst("Id")?.Value;
                if (!int.TryParse(userIdStr, out int userId))
                {
                    return Unauthorized(new { message = "Usuário não identificado" });
                }

                var denuncia = new Denuncia
                {
                    Descricao = request.Descricao.Trim(),
                    Latitude = request.Latitude,
                    Longitude = request.Longitude,
                    Bairro = request.Bairro ?? "Não especificado",
                    Status = "aberta",
                    IdUsuario = userId,
                    Data = DateTime.UtcNow
                };

                await _denunciaService.AddDenunciaAsync(denuncia);

                _logger.LogInformation($"Denúncia {denuncia.Id} criada pelo usuário {userId}");

                return CreatedAtAction(nameof(GetDenuncia), new { id = denuncia.Id }, denuncia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao criar denúncia");
                return StatusCode(500, new { message = "Erro ao criar denúncia" });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "Gerenciador")]
        public async Task<IActionResult> PutDenuncia(int id, [FromBody] UpdateDenunciaRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Status))
                {
                    return BadRequest(new { message = "Status é obrigatório" });
                }

                var statusValidos = new[] { "aberta", "em_inspecao", "resolvida" };
                if (!statusValidos.Contains(request.Status))
                {
                    return BadRequest(new { message = "Status inválido" });
                }

                var denuncia = await _denunciaService.GetDenunciaByIdAsync(id);
                if (denuncia == null)
                {
                    return NotFound(new { message = "Denúncia não encontrada" });
                }

                denuncia.Status = request.Status;

                await _denunciaService.UpdateDenunciaAsync(denuncia);

                _logger.LogInformation($"Denúncia {id} atualizada para status '{request.Status}'");

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao atualizar denúncia {id}");
                return StatusCode(500, new { message = "Erro ao atualizar denúncia" });
            }
        }

        [HttpGet("arquivadas")]
        [Authorize(Policy = "Administrador")]
        public async Task<ActionResult<IEnumerable<Denuncia>>> GetArquivadas()
        {
            try
            {
                var arquivadas = await _denunciaService.GetArquivadasAsync();
                return Ok(arquivadas);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar denúncias arquivadas");
                return StatusCode(500, new { message = "Erro ao buscar denúncias arquivadas" });
            }
        }

        [HttpPost("{id}/arquivar")]
        [Authorize(Policy = "Gerenciador")]
        public async Task<IActionResult> ArquivarDenuncia(int id)
        {
            try
            {
                await _denunciaService.ArquivarDenunciaAsync(id);
                _logger.LogInformation($"Denúncia {id} arquivada.");
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao arquivar denúncia {id}");
                return StatusCode(500, new { message = "Erro ao arquivar denúncia" });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "Tecnico")]
        public async Task<IActionResult> DeleteDenuncia(int id)
        {
            try
            {
                var denuncia = await _denunciaService.GetDenunciaByIdAsync(id);
                if (denuncia == null)
                {
                    return NotFound(new { message = "Denúncia não encontrada" });
                }

                await _denunciaService.DeleteDenunciaAsync(id);

                _logger.LogInformation($"Denúncia {id} deletada por técnico");

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao deletar denúncia {id}");
                return StatusCode(500, new { message = "Erro ao deletar denúncia" });
            }
        }

        [HttpPost("{id}/fotos")]
        [Authorize(Policy = "Cidadao")]
        public async Task<ActionResult<Foto>> PostFoto(int id, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { message = "Arquivo não fornecido" });
                }

                // Validações
                const long maxFileSize = 5 * 1024 * 1024; // 5MB
                if (file.Length > maxFileSize)
                {
                    return BadRequest(new { message = "Arquivo muito grande (máximo 5MB)" });
                }

                // Confere o tipo pelos bytes do arquivo, não só pelo que o navegador declara
                string? tipoReal;
                using (var leitura = file.OpenReadStream())
                    tipoReal = await sacd_backend.Seguranca.ImagemValidator.DetectarTipoAsync(leitura);
                if (tipoReal is null || tipoReal != file.ContentType)
                {
                    return BadRequest(new { message = "Tipo de arquivo não permitido (JPEG, PNG, WEBP)" });
                }

                var denuncia = await _denunciaService.GetDenunciaByIdAsync(id);
                if (denuncia == null)
                {
                    return NotFound(new { message = "Denúncia não encontrada" });
                }

                var userIdStr = User.FindFirst("Id")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                if (userRole == "cidadao" && denuncia.IdUsuario.ToString() != userIdStr)
                {
                    return Forbid();
                }

                var foto = await _fotoService.SaveFotoAsync(file, id);

                _logger.LogInformation($"Foto salva para denúncia {id}");

                return CreatedAtAction(nameof(GetDenuncia), new { id = id }, foto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao fazer upload de foto para denúncia {id}");
                return StatusCode(500, new { message = "Erro ao fazer upload de foto" });
            }
        }

        [HttpGet("{id}/fotos")]
        [Authorize(Policy = "Cidadao")]
        public async Task<ActionResult<IEnumerable<Foto>>> GetFotosDenuncia(int id)
        {
            try
            {
                var fotos = await _fotoService.GetFotosByDenunciaIdAsync(id);
                return Ok(fotos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao buscar fotos da denúncia {id}");
                return StatusCode(500, new { message = "Erro ao buscar fotos" });
            }
        }
    }

    public class CreateDenunciaRequest
    {
        public string Descricao { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Bairro { get; set; }
    }

    public class UpdateDenunciaRequest
    {
        public string Status { get; set; }
    }
}
