using System.ComponentModel.DataAnnotations;
using CalorieTracker.Server.Models;
using CalorieTracker.Server.DTOs;

namespace CalorieTracker.Server.DTOs
{
    public class MealDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateOnly Date { get; set; }
        public MealType MealType { get; set; }
        public string MealTypeName => MealType.ToString();
        public List<MealItemDto> Items { get; set; } = new();
        public decimal TotalCalories { get; set; }
        public decimal TotalProtein { get; set; }
        public decimal TotalFats { get; set; }
        public decimal TotalCarbs { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class MealItemDto
    {
        public int Id { get; set; }
        public int MealId { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string? FoodBrand { get; set; }
        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal FatsPer100g { get; set; }
        public decimal CarbsPer100g { get; set; }
        public decimal Quantity { get; set; }
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Fats { get; set; }
        public decimal Carbs { get; set; }
        public string? ExternalId { get; set; }
        public string? Source { get; set; }
    }

    public class MealCreateDto
    {
        [Required]
        public DateOnly Date { get; set; }

        [Required]
        public MealType MealType { get; set; }

        public List<MealItemCreateDto> Items { get; set; } = new();
    }

    public class MealItemCreateDto
    {
        [Required]
        [StringLength(200)]
        public string FoodName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? FoodBrand { get; set; }

        [Required]
        public decimal CaloriesPer100g { get; set; }

        public decimal ProteinPer100g { get; set; }
        public decimal FatsPer100g { get; set; }
        public decimal CarbsPer100g { get; set; }
        public decimal FiberPer100g { get; set; }

        [StringLength(100)]
        public string? ExternalId { get; set; }

        [StringLength(20)]
        public string? Source { get; set; }

        [Required]
        [Range(0.1, 9999.99)]
        public decimal Quantity { get; set; }
    }

    public class AddFoodToMealDto : MealItemCreateDto { }

    public class DailyMealsDto
    {
        public DateOnly Date { get; set; }
        public List<MealDto> Meals { get; set; } = new();
        public DailyNutritionSummaryDto Summary { get; set; } = new();
    }

    public class DailyNutritionSummaryDto
    {
        public decimal TotalCalories { get; set; }
        public decimal TotalProtein { get; set; }
        public decimal TotalFats { get; set; }
        public decimal TotalCarbs { get; set; }
        public decimal TotalFiber { get; set; }
        public int? DailyCalorieGoal { get; set; }
        public decimal CaloriesRemaining => (DailyCalorieGoal ?? 0) - TotalCalories;
        public decimal CaloriesProgress => DailyCalorieGoal > 0 ? (TotalCalories / DailyCalorieGoal.Value) * 100 : 0;
    }

    public class UpdateMealItemDto
    {
        [Required]
        [Range(0.1, 9999.99)]
        public decimal Quantity { get; set; }
    }
}