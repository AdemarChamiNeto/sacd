using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace sacd_backend.Models
{
    [Table("denuncias")]
    public class Denuncia
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(1000)]
        [Column("descricao")]
        public string Descricao { get; set; }

        [Required]
        [Column("latitude")]
        public double Latitude { get; set; }

        [Required]
        [Column("longitude")]
        public double Longitude { get; set; }

        [Column("data")]
        public DateTime Data { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(50)]
        [Column("status")]
        public string Status { get; set; } = "aberta";

        [ForeignKey("Usuario")]
        [Column("idusuario")]
        public int IdUsuario { get; set; }
        public Usuario Usuario { get; set; }

        [StringLength(200)]
        [Column("bairro")]
        public string Bairro { get; set; }

        // Arquivamento
        [Column("arquivada")]
        public bool Arquivada { get; set; } = false;

        [Column("dataarquivamento")]
        public DateTime? DataArquivamento { get; set; }

        public ICollection<Foto> Fotos { get; set; }
    }
}
