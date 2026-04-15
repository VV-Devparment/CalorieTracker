using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.Models
{
    public class Achievement
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual User User { get; set; } = null!;
    }
}
