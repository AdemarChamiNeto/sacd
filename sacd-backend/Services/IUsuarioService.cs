using sacd_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace sacd_backend.Services
{
    public interface IUsuarioService
    {
        Task<IEnumerable<Usuario>> GetAllUsuariosAsync();
        Task<Usuario> GetUsuarioByIdAsync(int id);
        Task AddUsuarioAsync(Usuario usuario);
        Task UpdateUsuarioAsync(Usuario usuario);
        Task DeleteUsuarioAsync(int id);
        Task<Usuario> GetUsuarioByFirebaseUidAsync(string firebaseUid);
        Task<int> GetTotalUsuariosAsync();
    }
}
