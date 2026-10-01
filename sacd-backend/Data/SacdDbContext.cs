using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using sacd_backend.Models;

namespace sacd_backend.Data
{
    public class SacdDbContext : DbContext
    {
        public SacdDbContext(DbContextOptions<SacdDbContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Denuncia> Denuncias { get; set; }
        public DbSet<Foto> Fotos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuração para a entidade Denuncia
            modelBuilder.Entity<Denuncia>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Descricao).IsRequired().HasMaxLength(1000).HasColumnName("descricao");
                entity.Property(e => e.Latitude).IsRequired().HasColumnName("latitude");
                entity.Property(e => e.Longitude).IsRequired().HasColumnName("longitude");
                entity.Property(e => e.Data).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("data");
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50).HasColumnName("status");
                entity.Property(e => e.Bairro).HasMaxLength(200).HasColumnName("bairro");
                entity.Property(e => e.IdUsuario).HasColumnName("idusuario");
                entity.Property(e => e.Arquivada).HasDefaultValue(false).HasColumnName("arquivada");
                entity.Property(e => e.DataArquivamento).HasColumnName("dataarquivamento");

                entity.HasOne(d => d.Usuario)
                      .WithMany(u => u.Denuncias)
                      .HasForeignKey(d => d.IdUsuario)
                      .OnDelete(DeleteBehavior.Restrict);

            });

            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Nome).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50).HasDefaultValue("cidadao");
                entity.Property(e => e.Ativo).IsRequired().HasDefaultValue(true);
                entity.Property(e => e.FirebaseUid).HasMaxLength(200);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            modelBuilder.Entity<Foto>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UrlArquivo).IsRequired().HasMaxLength(500).HasColumnName("urlarquivo");
                entity.Property(e => e.NomeArquivo).HasMaxLength(100).HasColumnName("nomearquivo");
                entity.Property(e => e.TipoMime).HasMaxLength(50).HasColumnName("tipomime");
                entity.Property(e => e.DataUpload).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("dataupload");
                entity.Property(e => e.IdDenuncia).HasColumnName("iddenuncia");

                entity.HasOne(f => f.Denuncia)
                      .WithMany(d => d.Fotos)
                      .HasForeignKey(f => f.IdDenuncia)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
