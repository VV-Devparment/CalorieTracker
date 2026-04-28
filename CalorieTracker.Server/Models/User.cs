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

        // Avatar stored as binary in DB; null = no avatar
        public byte[]? AvatarData { get; set; }

        [StringLength(100)]
        public string? AvatarContentType { get; set; }

        public DateTime? AvatarUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Authorization & moderation
        // Role: "User" (звичайний) | "Admin" (бачить адмін-панель). Default — "User".
        // Видається у JWT claim ClaimTypes.Role; апгрейд до Admin тільки через SQL/Supabase.
        [StringLength(20)]
        public string Role { get; set; } = "User";

        // Заблокований адміном — Login падає з 403; решта токенів існуючої сесії
        // лишаються чинними до expire (24 год). Жорсткіша інвалідація потребувала б
        // refresh-token або token-blacklist (поза скоупом).
        public bool IsBlocked { get; set; }
        public DateTime? BlockedAt { get; set; }

        [StringLength(500)]
        public string? BlockedReason { get; set; }

        // Navigation properties
        public virtual ICollection<Meal> Meals { get; set; } = new List<Meal>();
        public virtual ICollection<UserGoal> UserGoals { get; set; } = new List<UserGoal>();
        public virtual ICollection<WeightRecord> WeightRecords { get; set; } = new List<WeightRecord>();
        public virtual ICollection<Food> CustomFoods { get; set; } = new List<Food>();
    }
}