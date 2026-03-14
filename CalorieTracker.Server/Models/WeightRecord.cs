using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.Models
{
    public class WeightRecord
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [Range(1, 999.99)]
        public decimal Weight { get; set; } // в кг

        [Required]
        public DateOnly RecordDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual User User { get; set; } = null!;
    }
}