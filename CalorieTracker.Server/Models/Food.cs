using System.ComponentModel.DataAnnotations;
using CalorieTracker.Server.Models;

namespace CalorieTracker.Server.Models
{
    public class Food
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Brand { get; set; }

        [Required]
        public decimal CaloriesPer100g { get; set; }

        public decimal ProteinPer100g { get; set; } = 0;

        public decimal FatsPer100g { get; set; } = 0;

        public decimal CarbsPer100g { get; set; } = 0;

        public decimal FiberPer100g { get; set; } = 0;

        public decimal SugarPer100g { get; set; } = 0;

        public decimal SodiumPer100g { get; set; } = 0; // в мг

        [StringLength(50)]
        public string? Category { get; set; }

        [StringLength(50)]
        public string? Barcode { get; set; }

        [StringLength(100)]
        public string? ExternalId { get; set; } // ID у зовнішній БД (FDC ID для USDA, barcode для OFF)

        [StringLength(20)]
        public string? Source { get; set; } // "USDA" | "OpenFoodFacts" | null для власних

        public bool IsCustom { get; set; } = false;

        public int? CreatedBy { get; set; } // FK to User

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual User? Creator { get; set; }
    }
}