using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace sacd_backend.Models
{
    [Table("usuarios")]
    public class Usuario
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        [Column("nome")]
        public string Nome { get; set; }

        [Required]
        [StringLength(200)]
        [Column("email")]
        public string Email { get; set; }

        [Required]
        [StringLength(50)]
        [Column("role")]
        public string Role { get; set; }

        [Required]
        [Column("ativo")]
        public bool Ativo { get; set; } = true;

        [StringLength(200)]
        [Column("firebaseuid")]
        public string FirebaseUid { get; set; }

        [Column("createdat")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public ICollection<Denuncia>? Denuncias { get; set; }
    }
}