using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using sacd_backend.Data;
using sacd_backend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace sacd_backend.Services
{
    public class FotoService : IFotoService
    {
        private readonly SacdDbContext _context;

        public FotoService(SacdDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Foto>> GetAllFotosAsync()
        {
            return await _context.Fotos.ToListAsync();
        }

        public async Task<Foto> GetFotoByIdAsync(int id)
        {
            return await _context.Fotos.FindAsync(id);
        }

        public async Task AddFotoAsync(Foto foto)
        {
            _context.Fotos.Add(foto);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateFotoAsync(Foto foto)
        {
            _context.Entry(foto).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteFotoAsync(int id)
        {
            var foto = await _context.Fotos.FindAsync(id);
            if (foto != null)
            {
                _context.Fotos.Remove(foto);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Foto>> GetFotosByDenunciaIdAsync(int denunciaId)
        {
            return await _context.Fotos.Where(f => f.IdDenuncia == denunciaId).ToListAsync();
        }

        public async Task<Foto> SaveFotoAsync(IFormFile file, int idDenuncia)
        {
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
            Directory.CreateDirectory(uploadsPath);

            var nomeArquivo = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var caminhoCompleto = Path.Combine(uploadsPath, nomeArquivo);

            using (var stream = new FileStream(caminhoCompleto, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var foto = new Foto
            {
                UrlArquivo = $"/uploads/{nomeArquivo}",
                NomeArquivo = nomeArquivo,
                TipoMime = file.ContentType,
                IdDenuncia = idDenuncia,
                DataUpload = DateTime.UtcNow
            };

            _context.Fotos.Add(foto);
            await _context.SaveChangesAsync();

            return foto;
        }
    }

    public interface IFotoService
    {
        Task<IEnumerable<Foto>> GetAllFotosAsync();
        Task<Foto> GetFotoByIdAsync(int id);
        Task AddFotoAsync(Foto foto);
        Task UpdateFotoAsync(Foto foto);
        Task DeleteFotoAsync(int id);
        Task<IEnumerable<Foto>> GetFotosByDenunciaIdAsync(int denunciaId);
        Task<Foto> SaveFotoAsync(IFormFile file, int idDenuncia);
    }

}
