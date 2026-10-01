using Microsoft.AspNetCore.Mvc;
using sacd_backend.Services;
using sacd_backend.Data;
using sacd_backend.Models;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace sacd_backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StatsController : ControllerBase
    {
        private readonly IDenunciaService _denunciaService;
        private readonly IUsuarioService _usuarioService;
        private readonly SacdDbContext _context;

        public StatsController(IDenunciaService denunciaService, IUsuarioService usuarioService, SacdDbContext context)
        {
            _denunciaService = denunciaService;
            _usuarioService = usuarioService;
            _context = context;
        }

        [HttpGet("Public")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> GetPublicStats()
        {
            try
            {
                var todas = await _denunciaService.GetAllDenunciasAsync();
                var lista = todas.ToList();
                var total = lista.Count;
                var resolvidas = lista.Count(d => d.Status == "resolvida");
                var ativas = lista.Count(d => d.Status == "aberta" || d.Status == "em_inspecao");
                var taxaResolucao = total > 0 ? (int)Math.Round((double)resolvidas / total * 100) : 0;

                var totalUsuarios = await _usuarioService.GetTotalUsuariosAsync();

                return Ok(new
                {
                    total,
                    ativas,
                    resolvidas,
                    taxaResolucao,
                    totalUsuarios,
                });
            }
            catch
            {
                return Ok(new { total = 0, ativas = 0, resolvidas = 0, taxaResolucao = 0, totalUsuarios = 0 });
            }
        }

        [HttpGet("Summary")]
        [Authorize(Policy = "Administrador")]
        public async Task<ActionResult<object>> GetSummaryStats()
        {
            var totalDenuncias = await _denunciaService.GetTotalDenunciasAsync();
            var denunciasAbertas = await _denunciaService.GetDenunciasByStatusAsync("aberta");
            var denunciasResolvidas = await _denunciaService.GetDenunciasByStatusAsync("resolvida");

            return Ok(new
            {
                TotalDenuncias = totalDenuncias,
                DenunciasAbertas = denunciasAbertas.Count(),       // ✅ aqui
                DenunciasResolvidas = denunciasResolvidas.Count(), // ✅ aqui
            });
        }

        [HttpGet("DenunciasPorBairro")]
        public async Task<ActionResult<object>> GetDenunciasPorBairro()
        {
            var stats = await _denunciaService.GetDenunciasCountByBairroAsync();
            return Ok(stats);
        }

        [HttpGet("DenunciasPorStatus")]
        public async Task<ActionResult<object>> GetDenunciasPorStatus()
        {
            var stats = await _denunciaService.GetDenunciasCountByStatusAsync();
            return Ok(stats);
        }

        /// <summary>
        /// Retorna denúncias dentro de um raio geográfico usando PostGIS ST_DWithin.
        /// </summary>
        [HttpGet("denuncias-por-raio")]
        [Authorize(Policy = "Fiscal")]
        public async Task<ActionResult<object>> GetDenunciasPorRaio(
            [FromQuery] double lat,
            [FromQuery] double lng,
            [FromQuery] double metros = 500)
        {
            try
            {
                if (lat < -90 || lat > 90)
                    return BadRequest(new { message = "Latitude inválida" });

                if (lng < -180 || lng > 180)
                    return BadRequest(new { message = "Longitude inválida" });

                if (metros <= 0 || metros > 50000)
                    return BadRequest(new { message = "Raio deve estar entre 1 e 50000 metros" });

                // Consulta espacial PostGIS: ST_DWithin compara distâncias em metros
                // usando projeção geográfica (SRID 4326 / WGS-84).
                var denuncias = await _context.Denuncias
                    .FromSqlRaw(@"
                        SELECT * FROM denuncias
                        WHERE arquivada = false
                        AND ST_DWithin(
                            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                            ST_SetSRID(ST_MakePoint({0}, {1}), 4326)::geography,
                            {2}
                        )",
                        lng, lat, metros)
                    .ToListAsync();

                return Ok(new
                {
                    centro = new { lat, lng },
                    raioMetros = metros,
                    total = denuncias.Count,
                    denuncias
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao consultar denúncias por raio" });
            }
        }
    }
}