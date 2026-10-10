using FluentAssertions;
using Newtonsoft.Json.Linq;
using sacd_backend.Seguranca;
using Xunit;

namespace SacdBackend.Tests.Seguranca
{
    public class ImagemValidatorTests
    {
        [Fact]
        public void DetectaJpegPngWebp()
        {
            ImagemValidator.DetectarTipo(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }).Should().Be("image/jpeg");
            ImagemValidator.DetectarTipo(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }).Should().Be("image/png");
            ImagemValidator.DetectarTipo("RIFF\0\0\0\0WEBPVP8 "u8).Should().Be("image/webp");
        }

        [Fact]
        public void RecusaArquivoQueNaoEImagem()
        {
            ImagemValidator.DetectarTipo("<?php echo 1; ?>"u8).Should().BeNull();
            ImagemValidator.DetectarTipo("GIF89a"u8).Should().BeNull();
            ImagemValidator.DetectarTipo(ReadOnlySpan<byte>.Empty).Should().BeNull();
        }

        [Fact]
        public async Task LeOsBytesDoStream()
        {
            using var s = new MemoryStream(new byte[] { 0xFF, 0xD8, 0xFF, 0xDB, 1, 2, 3 });
            (await ImagemValidator.DetectarTipoAsync(s)).Should().Be("image/jpeg");
        }
    }

    public class LimitesDeRequisicaoTests
    {
        [Theory]
        [InlineData("POST", "/api/usuarios", LimitesDeRequisicao.Categoria.Cadastro)]
        [InlineData("POST", "/api/Usuarios/", LimitesDeRequisicao.Categoria.Cadastro)]
        [InlineData("POST", "/api/denuncias/5/fotos", LimitesDeRequisicao.Categoria.Upload)]
        [InlineData("POST", "/api/denuncias", LimitesDeRequisicao.Categoria.Escrita)]
        [InlineData("PUT", "/api/usuarios/permissao/3", LimitesDeRequisicao.Categoria.Escrita)]
        [InlineData("DELETE", "/api/denuncias/1", LimitesDeRequisicao.Categoria.Escrita)]
        [InlineData("GET", "/api/denuncias", LimitesDeRequisicao.Categoria.Leitura)]
        [InlineData("GET", "/api/stats/public", LimitesDeRequisicao.Categoria.Leitura)]
        public void ClassificaTodoEndpoint(string metodo, string caminho, LimitesDeRequisicao.Categoria esperada)
        {
            LimitesDeRequisicao.Classificar(metodo, caminho).Should().Be(esperada);
        }

        [Fact]
        public void CadastroEhMaisRigidoQueOResto()
        {
            var cadastro = LimitesDeRequisicao.Regra(LimitesDeRequisicao.Categoria.Cadastro);
            var leitura = LimitesDeRequisicao.Regra(LimitesDeRequisicao.Categoria.Leitura);
            (cadastro.Limite / cadastro.Janela.TotalMinutes).Should().BeLessThan(leitura.Limite / leitura.Janela.TotalMinutes);
        }
    }

    public class SegundoFatorTests
    {
        [Fact]
        public void DetectaLoginComTotp()
        {
            var claims = new Dictionary<string, object>
            {
                ["firebase"] = JObject.Parse("""{ "sign_in_provider": "password", "sign_in_second_factor": "totp" }"""),
            };
            VerificadorTokenFirebase.TemSegundoFator(claims).Should().BeTrue();
        }

        [Fact]
        public void LoginSoComSenhaNaoTemSegundoFator()
        {
            var claims = new Dictionary<string, object>
            {
                ["firebase"] = JObject.Parse("""{ "sign_in_provider": "password" }"""),
            };
            VerificadorTokenFirebase.TemSegundoFator(claims).Should().BeFalse();
            VerificadorTokenFirebase.TemSegundoFator(new Dictionary<string, object>()).Should().BeFalse();
        }

        [Fact]
        public void AceitaClaimComoDicionario()
        {
            var claims = new Dictionary<string, object>
            {
                ["firebase"] = new Dictionary<string, object> { ["sign_in_second_factor"] = "totp" },
            };
            VerificadorTokenFirebase.TemSegundoFator(claims).Should().BeTrue();
        }
    }
}
