namespace sacd_backend.Seguranca
{
    /// <summary>
    /// Confere o tipo real da imagem pelos primeiros bytes (assinatura), em vez de confiar
    /// no Content-Type e na extensão que o navegador manda.
    /// </summary>
    public static class ImagemValidator
    {
        public static readonly IReadOnlyDictionary<string, string> Extensoes = new Dictionary<string, string>
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
        };

        /// <summary>Retorna o MIME detectado (image/jpeg, image/png, image/webp) ou null se não for uma imagem aceita.</summary>
        public static string? DetectarTipo(ReadOnlySpan<byte> b)
        {
            if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
            if (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "image/png";
            if (b.Length >= 12 && b[0] == (byte)'R' && b[1] == (byte)'I' && b[2] == (byte)'F' && b[3] == (byte)'F'
                && b[8] == (byte)'W' && b[9] == (byte)'E' && b[10] == (byte)'B' && b[11] == (byte)'P') return "image/webp";
            return null;
        }

        public static async Task<string?> DetectarTipoAsync(Stream s, CancellationToken ct = default)
        {
            var buffer = new byte[12];
            var lidos = 0;
            while (lidos < buffer.Length)
            {
                var n = await s.ReadAsync(buffer.AsMemory(lidos), ct);
                if (n == 0) break;
                lidos += n;
            }
            return DetectarTipo(buffer.AsSpan(0, lidos));
        }
    }
}
