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

        public DateOnly? DateOfBirth { get; set; }

        // Weight removed — current weight is derived from the latest WeightRecord (3NF)
        // Height removed — stored in WeightRecord as it can change over time (3NF)

        [StringLength(10)]
        public string? Gender { get; set; } // Male, Female, Other

        public int ActivityLevel { get; set; } = 1; // 1-5

        // DailyCalorieGoal removed — computed from (Age, Height, Gender, ActivityLevel, currentWeight) (3NF)

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<Meal> Meals { get; set; } = new List<Meal>();
        public virtual ICollection<UserGoal> UserGoals { get; set; } = new List<UserGoal>();
        public virtual ICollection<WeightRecord> WeightRecords { get; set; } = new List<WeightRecord>();
        public virtual ICollection<Food> CustomFoods { get; set; } = new List<Food>();
    }
}