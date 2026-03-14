using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public int? Age { get; set; }

        public decimal? Weight { get; set; } // в кг

        public decimal? Height { get; set; } // в см

        [StringLength(10)]
        public string? Gender { get; set; } // Male, Female, Other

        public int ActivityLevel { get; set; } = 1; // 1-5

        public int? DailyCalorieGoal { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<Meal> Meals { get; set; } = new List<Meal>();
        public virtual ICollection<UserGoal> UserGoals { get; set; } = new List<UserGoal>();
        public virtual ICollection<WeightRecord> WeightRecords { get; set; } = new List<WeightRecord>();
        public virtual ICollection<Food> CustomFoods { get; set; } = new List<Food>();
    }
}