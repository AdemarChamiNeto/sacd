using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using sacd_backend.Controllers;
using sacd_backend.Models;
using sacd_backend.Services;
using System.Security.Claims;
using Xunit;

namespace SacdBackend.Tests.Controllers
{
    public class DenunciasControllerTests
    {
        private readonly Mock<IDenunciaService> _mockDenunciaService;
        private readonly Mock<IFotoService> _mockFotoService;
        private readonly Mock<ILogger<DenunciasController>> _mockLogger;
        private readonly DenunciasController _controller;

        public DenunciasControllerTests()
        {
            _mockDenunciaService = new Mock<IDenunciaService>();
            _mockFotoService = new Mock<IFotoService>();
            _mockLogger = new Mock<ILogger<DenunciasController>>();

            _controller = new DenunciasController(
                _mockDenunciaService.Object,
                _mockFotoService.Object,
                _mockLogger.Object
            );
        }

        // Auxiliar para simular usuário autenticado no contexto HTTP
        private void SetupUserContext(int userId, string role)
        {
            var claims = new List<Claim>
            {
                new Claim("Id", userId.ToString()),
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, $"firebase-uid-{userId}"),
            };

            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        // ==========================================
        // GET api/Denuncias
        // ==========================================

        [Fact]
        public async Task GetDenuncias_DeveRetornarOkComListaDeDenuncias()
        {
            SetupUserContext(1, "gerenciador");

            var denuncias = new List<Denuncia>
            {
                new Denuncia { Id = 1, Descricao = "Foco 1", Status = "aberta", IdUsuario = 1, Latitude = -25.4, Longitude = -49.2 },
                new Denuncia { Id = 2, Descricao = "Foco 2", Status = "resolvida", IdUsuario = 2, Latitude = -25.5, Longitude = -49.3 },
            };

            _mockDenunciaService
                .Setup(s => s.GetAllDenunciasAsync())
                .ReturnsAsync(denuncias);

            var result = await _controller.GetDenuncias();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);

            var returnedList = okResult.Value as IEnumerable<Denuncia>;
            returnedList.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetDenuncias_ComFiltroStatus_DeveRetornarApenasDoStatus()
        {
            SetupUserContext(1, "gerenciador");

            var denuncias = new List<Denuncia>
            {
                new Denuncia { Id = 1, Descricao = "Foco Aberto", Status = "aberta", IdUsuario = 1, Latitude = -25.4, Longitude = -49.2 },
                new Denuncia { Id = 2, Descricao = "Foco Resolvido", Status = "resolvida", IdUsuario = 2, Latitude = -25.5, Longitude = -49.3 },
            };

            _mockDenunciaService
                .Setup(s => s.GetAllDenunciasAsync())
                .ReturnsAsync(denuncias);

            var result = await _controller.GetDenuncias(status: "aberta");

            var okResult = result.Result as OkObjectResult;
            var list = okResult!.Value as IEnumerable<Denuncia>;
            list.Should().HaveCount(1);
            list!.First().Status.Should().Be("aberta");
        }

        [Fact]
        public async Task GetDenuncias_QuandoServicoFalha_DeveRetornar500()
        {
            SetupUserContext(1, "gerenciador");

            _mockDenunciaService
                .Setup(s => s.GetAllDenunciasAsync())
                .ThrowsAsync(new Exception("Erro no banco de dados"));

            var result = await _controller.GetDenuncias();

            var statusResult = result.Result as ObjectResult;
            statusResult!.StatusCode.Should().Be(500);
        }

        // ==========================================
        // GET api/Denuncias/minhas
        // ==========================================

        [Fact]
        public async Task GetMinhasDenuncias_DeveRetornarDenunciasDoUsuario()
        {
            SetupUserContext(5, "cidadao");

            var denuncias = new List<Denuncia>
            {
                new Denuncia { Id = 10, Descricao = "Minha denúncia", Status = "aberta", IdUsuario = 5, Latitude = -25.4, Longitude = -49.2 }
            };

            _mockDenunciaService
                .Setup(s => s.GetDenunciasByUsuarioIdAsync(5))
                .ReturnsAsync(denuncias);

            var result = await _controller.GetMinhasDenuncias();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            var list = okResult!.Value as IEnumerable<Denuncia>;
            list.Should().HaveCount(1);
        }

        // ==========================================
        // GET api/Denuncias/{id}
        // ==========================================

        [Fact]
        public async Task GetDenuncia_DeveRetornarDenunciaQuandoExiste()
        {
            SetupUserContext(1, "gerenciador");

            var denuncia = new Denuncia { Id = 1, Descricao = "Foco", Status = "aberta", IdUsuario = 1, Latitude = -25.4, Longitude = -49.2 };

            _mockDenunciaService
                .Setup(s => s.GetDenunciaByIdAsync(1))
                .ReturnsAsync(denuncia);

            var result = await _controller.GetDenuncia(1);

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            (okResult!.Value as Denuncia)!.Id.Should().Be(1);
        }

        [Fact]
        public async Task GetDenuncia_DeveRetornarNotFoundQuandoNaoExiste()
        {
            SetupUserContext(1, "gerenciador");

            _mockDenunciaService
                .Setup(s => s.GetDenunciaByIdAsync(999))
                .ReturnsAsync((Denuncia?)null);

            var result = await _controller.GetDenuncia(999);

            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        // ==========================================
        // POST api/Denuncias
        // ==========================================

        [Fact]
        public async Task PostDenuncia_DeveCriarDenunciaComSucesso()
        {
            SetupUserContext(1, "cidadao");

            _mockDenunciaService
                .Setup(s => s.AddDenunciaAsync(It.IsAny<Denuncia>()))
                .Returns(Task.CompletedTask);

            var request = new CreateDenunciaRequest
            {
                Descricao = "Pneu com água",
                Latitude = -25.4284,
                Longitude = -49.2733,
                Bairro = "Centro"
            };

            var result = await _controller.PostDenuncia(request);

            result.Result.Should().BeOfType<CreatedAtActionResult>();
            _mockDenunciaService.Verify(s => s.AddDenunciaAsync(It.IsAny<Denuncia>()), Times.Once);
        }

        [Fact]
        public async Task PostDenuncia_ComDescricaoVazia_DeveRetornarBadRequest()
        {
            SetupUserContext(1, "cidadao");

            var request = new CreateDenunciaRequest
            {
                Descricao = "",
                Latitude = -25.4284,
                Longitude = -49.2733,
            };

            var result = await _controller.PostDenuncia(request);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task PostDenuncia_ComLatitudeInvalida_DeveRetornarBadRequest()
        {
            SetupUserContext(1, "cidadao");

            var request = new CreateDenunciaRequest
            {
                Descricao = "Foco de dengue",
                Latitude = 200, // inválida
                Longitude = -49.2733,
            };

            var result = await _controller.PostDenuncia(request);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task PostDenuncia_ComLongitudeInvalida_DeveRetornarBadRequest()
        {
            SetupUserContext(1, "cidadao");

            var request = new CreateDenunciaRequest
            {
                Descricao = "Foco de dengue",
                Latitude = -25.4284,
                Longitude = 300, // inválida
            };

            var result = await _controller.PostDenuncia(request);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task PostDenuncia_ComDescricaoMuitoLonga_DeveRetornarBadRequest()
        {
            SetupUserContext(1, "cidadao");

            var request = new CreateDenunciaRequest
            {
                Descricao = new string('x', 1001), // mais de 1000 caracteres
                Latitude = -25.4284,
                Longitude = -49.2733,
            };

            var result = await _controller.PostDenuncia(request);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        // ==========================================
        // PUT api/Denuncias/{id}
        // ==========================================

        [Fact]
        public async Task PutDenuncia_DeveAtualizarStatusComSucesso()
        {
            SetupUserContext(1, "gerenciador");

            var denuncia = new Denuncia { Id = 1, Descricao = "Foco", Status = "aberta", IdUsuario = 1, Latitude = -25.4, Longitude = -49.2 };

            _mockDenunciaService.Setup(s => s.GetDenunciaByIdAsync(1)).ReturnsAsync(denuncia);
            _mockDenunciaService.Setup(s => s.UpdateDenunciaAsync(It.IsAny<Denuncia>())).Returns(Task.CompletedTask);

            var request = new UpdateDenunciaRequest { Status = "em_inspecao" };

            var result = await _controller.PutDenuncia(1, request);

            result.Should().BeOfType<NoContentResult>();
            _mockDenunciaService.Verify(s => s.UpdateDenunciaAsync(It.Is<Denuncia>(d => d.Status == "em_inspecao")), Times.Once);
        }

        [Fact]
        public async Task PutDenuncia_ComStatusInvalido_DeveRetornarBadRequest()
        {
            SetupUserContext(1, "gerenciador");

            var request = new UpdateDenunciaRequest { Status = "invalido" };

            var result = await _controller.PutDenuncia(1, request);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task PutDenuncia_QuandoDenunciaNaoExiste_DeveRetornarNotFound()
        {
            SetupUserContext(1, "gerenciador");

            _mockDenunciaService.Setup(s => s.GetDenunciaByIdAsync(999)).ReturnsAsync((Denuncia?)null);

            var request = new UpdateDenunciaRequest { Status = "resolvida" };

            var result = await _controller.PutDenuncia(999, request);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        // ==========================================
        // DELETE api/Denuncias/{id}
        // ==========================================

        [Fact]
        public async Task DeleteDenuncia_DeveDeletarComSucesso()
        {
            SetupUserContext(1, "tecnico");

            var denuncia = new Denuncia { Id = 1, Descricao = "Foco", Status = "aberta", IdUsuario = 1, Latitude = -25.4, Longitude = -49.2 };

            _mockDenunciaService.Setup(s => s.GetDenunciaByIdAsync(1)).ReturnsAsync(denuncia);
            _mockDenunciaService.Setup(s => s.DeleteDenunciaAsync(1)).Returns(Task.CompletedTask);

            var result = await _controller.DeleteDenuncia(1);

            result.Should().BeOfType<NoContentResult>();
            _mockDenunciaService.Verify(s => s.DeleteDenunciaAsync(1), Times.Once);
        }

        [Fact]
        public async Task DeleteDenuncia_QuandoDenunciaNaoExiste_DeveRetornarNotFound()
        {
            SetupUserContext(1, "tecnico");

            _mockDenunciaService.Setup(s => s.GetDenunciaByIdAsync(999)).ReturnsAsync((Denuncia?)null);

            var result = await _controller.DeleteDenuncia(999);

            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
