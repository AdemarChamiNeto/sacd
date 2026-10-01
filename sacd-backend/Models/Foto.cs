using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace sacd_backend.Models
{
    [Table("fotos")]
    public class Foto
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(500)]
        [Column("urlarquivo")]
        public string UrlArquivo { get; set; }

        [StringLength(100)]
        [Column("nomearquivo")]
        public string NomeArquivo { get; set; }

        [StringLength(50)]
        [Column("tipomime")]
        public string TipoMime { get; set; }

        [Column("dataupload")]
        public DateTime DataUpload { get; set; } = DateTime.UtcNow;

        [ForeignKey("Denuncia")]
        [Column("iddenuncia")]
        public int IdDenuncia { get; set; }

        [JsonIgnore]
        public Denuncia Denuncia { get; set; }
    }
}
