using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using sacd_backend.Data;
using sacd_backend.Models;
using sacd_backend.Services;
using Xunit;

namespace SacdBackend.Tests.Services
{
    public class DenunciaServiceTests : IDisposable
    {
        private readonly SacdDbContext _context;
        private readonly DenunciaService _service;

        public DenunciaServiceTests()
        {
            var options = new DbContextOptionsBuilder<SacdDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new SacdDbContext(options);
            _service = new DenunciaService(_context);

            SeedDatabase();
        }

        private void SeedDatabase()
        {
            var usuario = new Usuario
            {
                Id = 1,
                Nome = "Cidadão Teste",
                Email = "cidadao@test.com",
                Role = "cidadao",
                Ativo = true,
                FirebaseUid = "uid-123",
            };

            _context.Usuarios.Add(usuario);

            _context.Denuncias.AddRange(
                new Denuncia
                {
                    Id = 1,
                    Descricao = "Pneu com água parada",
                    Latitude = -25.4284,
                    Longitude = -49.2733,
                    Status = "aberta",
                    IdUsuario = 1,
                    Bairro = "Centro",
                    Data = DateTime.UtcNow.AddDays(-3),
                },
                new Denuncia
                {
                    Id = 2,
                    Descricao = "Caixa d'água destampada",
                    Latitude = -25.4300,
                    Longitude = -49.2750,
                    Status = "em_inspecao",
                    IdUsuario = 1,
                    Bairro = "Vila Nova",
                    Data = DateTime.UtcNow.AddDays(-1),
                },
                new Denuncia
                {
                    Id = 3,
                    Descricao = "Piscina abandonada",
                    Latitude = -25.4320,
                    Longitude = -49.2760,
                    Status = "resolvida",
                    IdUsuario = 1,
                    Bairro = "Centro",
                    Data = DateTime.UtcNow,
                }
            );

            _context.SaveChanges();
        }

        // ✅ GetAllDenunciasAsync
        [Fact]
        public async Task GetAllDenunciasAsync_DeveRetornarTodasAsDenuncias()
        {
            var result = await _service.GetAllDenunciasAsync();

            result.Should().HaveCount(3);
        }

        // ✅ GetDenunciaByIdAsync - Existente
        [Fact]
        public async Task GetDenunciaByIdAsync_DeveRetornarDenunciaQuandoExiste()
        {
            var result = await _service.GetDenunciaByIdAsync(1);

            result.Should().NotBeNull();
            result!.Id.Should().Be(1);
            result.Descricao.Should().Be("Pneu com água parada");
        }

        // ✅ GetDenunciaByIdAsync - Não existente
        [Fact]
        public async Task GetDenunciaByIdAsync_DeveRetornarNullQuandoNaoExiste()
        {
            var result = await _service.GetDenunciaByIdAsync(999);

            result.Should().BeNull();
        }

        // ✅ GetDenunciasByUsuarioIdAsync
        [Fact]
        public async Task GetDenunciasByUsuarioIdAsync_DeveRetornarDenunciasDoUsuario()
        {
            var result = await _service.GetDenunciasByUsuarioIdAsync(1);

            result.Should().HaveCount(3);
            result.All(d => d.IdUsuario == 1).Should().BeTrue();
        }

        [Fact]
        public async Task GetDenunciasByUsuarioIdAsync_DeveRetornarVazioParaUsuarioSemDenuncias()
        {
            var result = await _service.GetDenunciasByUsuarioIdAsync(999);

            result.Should().BeEmpty();
        }

        // ✅ AddDenunciaAsync
        [Fact]
        public async Task AddDenunciaAsync_DeveSalvarNovaDenuncia()
        {
            var novaDenuncia = new Denuncia
            {
                Descricao = "Galão d'água",
                Latitude = -25.4400,
                Longitude = -49.2900,
                Status = "aberta",
                IdUsuario = 1,
                Bairro = "Boa Vista",
                Data = DateTime.UtcNow,
            };

            await _service.AddDenunciaAsync(novaDenuncia);

            var all = await _service.GetAllDenunciasAsync();
            all.Should().HaveCount(4);
            all.Should().Contain(d => d.Descricao == "Galão d'água");
        }

        // ✅ UpdateDenunciaAsync
        [Fact]
        public async Task UpdateDenunciaAsync_DeveAtualizarStatus()
        {
            var denuncia = await _service.GetDenunciaByIdAsync(1);
            denuncia!.Status = "em_inspecao";

            await _service.UpdateDenunciaAsync(denuncia);

            var updated = await _service.GetDenunciaByIdAsync(1);
            updated!.Status.Should().Be("em_inspecao");
        }

        // ✅ DeleteDenunciaAsync
        [Fact]
        public async Task DeleteDenunciaAsync_DeveRemoverDenuncia()
        {
            await _service.DeleteDenunciaAsync(1);

            var result = await _service.GetDenunciaByIdAsync(1);
            result.Should().BeNull();

            var all = await _service.GetAllDenunciasAsync();
            all.Should().HaveCount(2);
        }

        [Fact]
        public async Task DeleteDenunciaAsync_NaoDeveFalharParaIdInexistente()
        {
            var exception = await Record.ExceptionAsync(() => _service.DeleteDenunciaAsync(999));
            exception.Should().BeNull();
        }

        // ✅ GetDenunciasByStatusAsync
        [Fact]
        public async Task GetDenunciasByStatusAsync_DeveRetornarSomenteOStatusEspecificado()
        {
            var result = await _service.GetDenunciasByStatusAsync("aberta");

            result.Should().HaveCount(1);
            result.All(d => d.Status == "aberta").Should().BeTrue();
        }

        [Fact]
        public async Task GetDenunciasByStatusAsync_DeveRetornarVazioParaStatusInexistente()
        {
            var result = await _service.GetDenunciasByStatusAsync("arquivada");

            result.Should().BeEmpty();
        }

        // ✅ GetTotalDenunciasAsync
        [Fact]
        public async Task GetTotalDenunciasAsync_DeveRetornarContagem()
        {
            var total = await _service.GetTotalDenunciasAsync();

            total.Should().Be(3);
        }

        // ✅ GetDenunciasCountByStatusAsync
        [Fact]
        public async Task GetDenunciasCountByStatusAsync_DeveRetornarContagemPorStatus()
        {
            var result = await _service.GetDenunciasCountByStatusAsync();

            result.Should().ContainKey("aberta").WhoseValue.Should().Be(1);
            result.Should().ContainKey("em_inspecao").WhoseValue.Should().Be(1);
            result.Should().ContainKey("resolvida").WhoseValue.Should().Be(1);
        }

        // ✅ GetDenunciasCountByBairroAsync
        [Fact]
        public async Task GetDenunciasCountByBairroAsync_DeveRetornarContagemPorBairro()
        {
            var result = await _service.GetDenunciasCountByBairroAsync();

            result.Should().ContainKey("Centro").WhoseValue.Should().Be(2);
            result.Should().ContainKey("Vila Nova").WhoseValue.Should().Be(1);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
