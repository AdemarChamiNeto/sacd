using sacd_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace sacd_backend.Services
{
    public interface IDenunciaService
    {
        Task<IEnumerable<Denuncia>> GetDenunciasByUsuarioIdAsync(int usuarioId);
        Task<IEnumerable<Denuncia>> GetAllDenunciasAsync();
        Task<Denuncia> GetDenunciaByIdAsync(int id);
        Task AddDenunciaAsync(Denuncia denuncia);
        Task UpdateDenunciaAsync(Denuncia denuncia);
        Task DeleteDenunciaAsync(int id);
        Task ArquivarDenunciaAsync(int id);
        Task LimparArquivadasAntigasAsync();
        Task<IEnumerable<Denuncia>> GetArquivadasAsync();
        Task<int> GetTotalDenunciasAsync();
        Task<IEnumerable<Denuncia>> GetDenunciasByStatusAsync(string status);
        Task<Dictionary<string, int>> GetDenunciasCountByBairroAsync();
        Task<Dictionary<string, int>> GetDenunciasCountByStatusAsync();
    }
}