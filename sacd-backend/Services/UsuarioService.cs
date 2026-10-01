using Microsoft.EntityFrameworkCore;
using sacd_backend.Data;
using sacd_backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace sacd_backend.Services
{
    public class UsuarioService : IUsuarioService
    {
        private readonly SacdDbContext _context;

        public UsuarioService(SacdDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Usuario>> GetAllUsuariosAsync()
        {
            return await _context.Usuarios.ToListAsync();
        }

        public async Task<Usuario> GetUsuarioByIdAsync(int id)
        {
            return await _context.Usuarios.FindAsync(id);
        }

        public async Task AddUsuarioAsync(Usuario usuario)
        {
            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateUsuarioAsync(Usuario usuario)
        {
            _context.Entry(usuario).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteUsuarioAsync(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario != null)
            {
                _context.Usuarios.Remove(usuario);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<Usuario> GetUsuarioByFirebaseUidAsync(string firebaseUid)
        {
            return await _context.Usuarios.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
        }

        public async Task<int> GetTotalUsuariosAsync()
        {
            return await _context.Usuarios.CountAsync();
        }
    }
}
