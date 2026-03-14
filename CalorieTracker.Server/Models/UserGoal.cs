using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.Models
{
    public class UserGoal
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string GoalType { get; set; } = string.Empty; // WeightLoss, WeightGain, Maintenance

        public decimal? TargetWeight { get; set; }

        public DateOnly? TargetDate { get; set; }

        public int? DailyCalorieTarget { get; set; }

        public decimal? DailyProteinTarget { get; set; }

        public decimal? DailyFatsTarget { get; set; }

        public decimal? DailyCarbsTarget { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual User User { get; set; } = null!;
    }
}