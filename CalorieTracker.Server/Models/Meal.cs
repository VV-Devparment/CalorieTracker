using System.ComponentModel.DataAnnotations;
using CalorieTracker.Server.Models;

namespace CalorieTracker.Server.Models
{
    public class Meal
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public DateOnly Date { get; set; }

        [Required]
        public MealType MealType { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual ICollection<MealItem> Items { get; set; } = new List<MealItem>();
    }

    public enum MealType
    {
        Breakfast = 1,
        Lunch = 2,
        Dinner = 3,
        Snack = 4
    }
}