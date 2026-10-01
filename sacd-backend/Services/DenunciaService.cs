using Microsoft.EntityFrameworkCore;
using sacd_backend.Data;
using sacd_backend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace sacd_backend.Services
{
    public class DenunciaService : IDenunciaService
    {
        private readonly SacdDbContext _context;

        public DenunciaService(SacdDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Denuncia>> GetDenunciasByUsuarioIdAsync(int usuarioId)
        {
            return await _context.Denuncias
                .Include(d => d.Usuario)
                .Include(d => d.Fotos)
                .Where(d => d.IdUsuario == usuarioId)
                .ToListAsync();
        }

        public async Task<IEnumerable<Denuncia>> GetAllDenunciasAsync()
        {
            return await _context.Denuncias
                .Include(d => d.Usuario)
                .Include(d => d.Fotos)
                .Where(d => !d.Arquivada)   // oculta denúncias arquivadas da listagem padrão
                .ToListAsync();
        }

        public async Task<Denuncia> GetDenunciaByIdAsync(int id)
        {
            return await _context.Denuncias
                .Include(d => d.Usuario)
                .Include(d => d.Fotos)
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task AddDenunciaAsync(Denuncia denuncia)
        {
            _context.Denuncias.Add(denuncia);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateDenunciaAsync(Denuncia denuncia)
        {
            _context.Entry(denuncia).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteDenunciaAsync(int id)
        {
            var denuncia = await _context.Denuncias.FindAsync(id);
            if (denuncia != null)
            {
                _context.Denuncias.Remove(denuncia);
                await _context.SaveChangesAsync();
            }
        }


        public async Task ArquivarDenunciaAsync(int id)
        {
            var denuncia = await _context.Denuncias.FindAsync(id);
            if (denuncia == null) throw new KeyNotFoundException($"Denúncia {id} não encontrada.");
            if (denuncia.Status != "resolvida")
                throw new InvalidOperationException("Só é possível arquivar denúncias com status 'resolvida'.");

            denuncia.Arquivada = true;
            denuncia.DataArquivamento = DateTime.UtcNow;
            _context.Entry(denuncia).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Denuncia>> GetArquivadasAsync()
        {
            return await _context.Denuncias
                .Include(d => d.Fotos)
                .Where(d => d.Arquivada)
                .OrderByDescending(d => d.DataArquivamento)
                .ToListAsync();
        }

        public Task LimparArquivadasAntigasAsync()
        {
            // Deleção automática desativada — denúncias arquivadas são retidas indefinidamente.
            return Task.CompletedTask;
        }

        public async Task<int> GetTotalDenunciasAsync()
        {
            return await _context.Denuncias.CountAsync();
        }

        public async Task<IEnumerable<Denuncia>> GetDenunciasByStatusAsync(string status)
        {
            return await _context.Denuncias
                .Where(d => d.Status == status)
                .ToListAsync();
        }

        public async Task<Dictionary<string, int>> GetDenunciasCountByBairroAsync()
        {
            return await _context.Denuncias
                .Where(d => d.Bairro != null && d.Bairro != "")
                .GroupBy(d => d.Bairro)
                .Select(g => new { Bairro = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Bairro, x => x.Count);
        }

        public async Task<Dictionary<string, int>> GetDenunciasCountByStatusAsync()
        {
            return await _context.Denuncias
                .GroupBy(d => d.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);
        }
    }
}