using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.Models
{
    public class MealItem
    {
        public int Id { get; set; }

        [Required]
        public int MealId { get; set; }

        // ── Inline food data — no FK to Foods table ─────────────────────

        [Required]
        [StringLength(200)]
        public string FoodName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? FoodBrand { get; set; }

        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal FatsPer100g { get; set; }
        public decimal CarbsPer100g { get; set; }
        public decimal FiberPer100g { get; set; }

        [StringLength(100)]
        public string? ExternalId { get; set; } // FDC ID (USDA) або barcode (OFF)

        [StringLength(20)]
        public string? Source { get; set; } // "USDA" | "OpenFoodFacts" | "Custom"

        // ────────────────────────────────────────────────────────────────

        [Required]
        [Range(0.1, 9999.99)]
        public decimal Quantity { get; set; } // в грамах

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual Meal Meal { get; set; } = null!;

        // Calculated properties
        public decimal Calories => Math.Round(Quantity * CaloriesPer100g / 100, 1);
        public decimal Protein  => Math.Round(Quantity * ProteinPer100g  / 100, 1);
        public decimal Fats     => Math.Round(Quantity * FatsPer100g     / 100, 1);
        public decimal Carbs    => Math.Round(Quantity * CarbsPer100g    / 100, 1);
    }
}
