using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using sacd_backend.Controllers;
using sacd_backend.Models;
using sacd_backend.Services;
using System.Security.Claims;
using Xunit;

namespace SacdBackend.Tests.Controllers
{
    public class UsuariosControllerTests
    {
        private readonly Mock<IUsuarioService> _mockUsuarioService;
        private readonly UsuariosController _controller;

        public UsuariosControllerTests()
        {
            _mockUsuarioService = new Mock<IUsuarioService>();
            _controller = new UsuariosController(_mockUsuarioService.Object);
        }

        private void SetupUserContext(string firebaseUid, string role, int? userId = null)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, firebaseUid),
                new Claim(ClaimTypes.Role, role),
            };

            if (userId.HasValue)
                claims.Add(new Claim("Id", userId.Value.ToString()));

            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        // ==========================================
        // GET api/Usuarios/me
        // ==========================================

        [Fact]
        public async Task GetMe_DeveRetornarUsuarioAutenticado()
        {
            SetupUserContext("uid-abc123", "cidadao");

            var usuario = new Usuario
            {
                Id = 1,
                Nome = "João",
                Email = "joao@test.com",
                Role = "cidadao",
                FirebaseUid = "uid-abc123",
                Ativo = true
            };

            _mockUsuarioService
                .Setup(s => s.GetUsuarioByFirebaseUidAsync("uid-abc123"))
                .ReturnsAsync(usuario);

            var result = await _controller.GetMe();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            (okResult!.Value as Usuario)!.Email.Should().Be("joao@test.com");
        }

        [Fact]
        public async Task GetMe_QuandoUsuarioNaoExiste_DeveRetornarNotFound()
        {
            SetupUserContext("uid-naoexiste", "cidadao");

            _mockUsuarioService
                .Setup(s => s.GetUsuarioByFirebaseUidAsync("uid-naoexiste"))
                .ReturnsAsync((Usuario?)null);

            var result = await _controller.GetMe();

            result.Result.Should().BeOfType<NotFoundResult>();
        }

        // ==========================================
        // GET api/Usuarios
        // ==========================================

        [Fact]
        public async Task GetUsuarios_DeveRetornarListaDeUsuarios()
        {
            SetupUserContext("uid-admin", "administrador");

            var usuarios = new List<Usuario>
            {
                new Usuario { Id = 1, Nome = "Admin", Email = "admin@test.com", Role = "administrador", Ativo = true },
                new Usuario { Id = 2, Nome = "João", Email = "joao@test.com", Role = "cidadao", Ativo = true },
            };

            _mockUsuarioService
                .Setup(s => s.GetAllUsuariosAsync())
                .ReturnsAsync(usuarios);

            var result = await _controller.GetUsuarios();

            var okResult = result.Result as OkObjectResult;
            okResult.Should().NotBeNull();
            (okResult!.Value as IEnumerable<Usuario>).Should().HaveCount(2);
        }

        // ==========================================
        // POST api/Usuarios
        // ==========================================

        [Fact]
        public async Task PostUsuario_DeveCriarNovoCidadao()
        {
            _mockUsuarioService
                .Setup(s => s.AddUsuarioAsync(It.IsAny<Usuario>()))
                .Returns(Task.CompletedTask);

            var novoUsuario = new Usuario
            {
                Nome = "Maria",
                Email = "maria@test.com",
                FirebaseUid = "uid-maria",
                Role = "tecnico", // deve ser forçado para cidadao
            };

            var result = await _controller.PostUsuario(novoUsuario);

            result.Result.Should().BeOfType<CreatedAtActionResult>();

            var createdResult = result.Result as CreatedAtActionResult;
            var created = createdResult!.Value as Usuario;
            created!.Role.Should().Be("cidadao"); // sempre cidadão
            created.Ativo.Should().BeTrue();
        }

        [Fact]
        public async Task PostUsuario_DeveForcarRoleCidadao_MesmoSePassarOutraRole()
        {
            _mockUsuarioService
                .Setup(s => s.AddUsuarioAsync(It.IsAny<Usuario>()))
                .Returns(Task.CompletedTask);

            var novoUsuario = new Usuario
            {
                Nome = "Hacker",
                Email = "hacker@test.com",
                FirebaseUid = "uid-hacker",
                Role = "tecnico", // tentativa de escalada
            };

            await _controller.PostUsuario(novoUsuario);

            _mockUsuarioService.Verify(s => s.AddUsuarioAsync(
                It.Is<Usuario>(u => u.Role == "cidadao")
            ), Times.Once);
        }

        // ==========================================
        // PUT api/Usuarios/permissao/{id}
        // ==========================================

        [Fact]
        public async Task AlterarPermissao_DeveAtualizarRoleComSucesso()
        {
            SetupUserContext("uid-admsupremo", "tecnico");

            var usuario = new Usuario { Id = 5, Nome = "User", Email = "user@test.com", Role = "cidadao", Ativo = true };

            _mockUsuarioService.Setup(s => s.GetUsuarioByIdAsync(5)).ReturnsAsync(usuario);
            _mockUsuarioService.Setup(s => s.UpdateUsuarioAsync(It.IsAny<Usuario>())).Returns(Task.CompletedTask);

            var result = await _controller.AlterarPermissao(5, "gerenciador");

            result.Should().BeOfType<NoContentResult>();
            _mockUsuarioService.Verify(s => s.UpdateUsuarioAsync(
                It.Is<Usuario>(u => u.Role == "gerenciador")
            ), Times.Once);
        }

        [Fact]
        public async Task AlterarPermissao_ComRoleInvalida_DeveRetornarBadRequest()
        {
            SetupUserContext("uid-admsupremo", "tecnico");

            var result = await _controller.AlterarPermissao(5, "superadmin_fake");

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task AlterarPermissao_QuandoUsuarioNaoExiste_DeveRetornarNotFound()
        {
            SetupUserContext("uid-admsupremo", "tecnico");

            _mockUsuarioService.Setup(s => s.GetUsuarioByIdAsync(999)).ReturnsAsync((Usuario?)null);

            var result = await _controller.AlterarPermissao(999, "gerenciador");

            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async Task AlterarPermissao_ComRoleVazia_DeveRetornarBadRequest()
        {
            SetupUserContext("uid-admsupremo", "tecnico");

            var result = await _controller.AlterarPermissao(5, "");

            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }
}
