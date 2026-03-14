using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.DTOs
{
    public class FoodDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Brand { get; set; }
        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal FatsPer100g { get; set; }
        public decimal CarbsPer100g { get; set; }
        public decimal FiberPer100g { get; set; }
        public decimal SugarPer100g { get; set; }
        public decimal SodiumPer100g { get; set; }
        public string? Category { get; set; }
        public string? Barcode { get; set; }
        public bool IsCustom { get; set; } // Чи це МІЙ продукт
                                           // ⭐ НОВИЙ: Чи це взагалі кастомний продукт (будь-якого користувача)
        public bool IsUserGenerated { get; set; }
        // ⭐ НОВИЙ: Ім'я користувача, який створив продукт
        public string? CreatedByName { get; set; }
    }


    public class FoodCreateDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [StringLength(100)]
        public string? Brand { get; set; }

        [Required]
        [Range(0, 9999.99)]
        public decimal CaloriesPer100g { get; set; }

        [Range(0, 999.99)]
        public decimal ProteinPer100g { get; set; } = 0;

        [Range(0, 999.99)]
        public decimal FatsPer100g { get; set; } = 0;

        [Range(0, 999.99)]
        public decimal CarbsPer100g { get; set; } = 0;

        [Range(0, 999.99)]
        public decimal FiberPer100g { get; set; } = 0;

        [Range(0, 999.99)]
        public decimal SugarPer100g { get; set; } = 0;

        [Range(0, 9999.99)]
        public decimal SodiumPer100g { get; set; } = 0;

        [StringLength(50)]
        public string? Category { get; set; }

        [StringLength(50)]
        public string? Barcode { get; set; }
    }

    public class FoodSearchDto
    {
        public string? Query { get; set; }
        public string? Category { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public bool? CustomOnly { get; set; }
    }

    public class ExternalFoodDto
    {
        public string ExternalId { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty; // "USDA" | "OpenFoodFacts"
        public string Name { get; set; } = string.Empty;
        public string? Brand { get; set; }
        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal FatsPer100g { get; set; }
        public decimal CarbsPer100g { get; set; }
        public decimal FiberPer100g { get; set; }
        public decimal SugarPer100g { get; set; }
        public decimal SodiumPer100g { get; set; }
        public string? Category { get; set; }
        public string? Barcode { get; set; }
    }
}