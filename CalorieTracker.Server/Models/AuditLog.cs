using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.Models
{
    /// <summary>
    /// Запис у журналі дій адмінів і серверних помилок.
    ///
    /// Action — тип події (USER_BLOCKED, FOOD_DELETED, API_ERROR тощо).
    /// Level   — Info (адмінська дія) | Error (необроблена помилка з middleware).
    /// EntityType/EntityId — на яку сутність впливала дія (наприклад "User"/123).
    /// ActorUserId — хто зробив (null для серверних помилок без юзера).
    /// Details — вільний текст (повідомлення помилки, причина блокування тощо).
    /// </summary>
    public class AuditLog
    {
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [StringLength(20)]
        public string Level { get; set; } = "Info"; // Info | Warning | Error

        [Required]
        [StringLength(50)]
        public string Action { get; set; } = string.Empty;

        public int? ActorUserId { get; set; }

        [StringLength(255)]
        public string? ActorEmail { get; set; }

        [StringLength(50)]
        public string? EntityType { get; set; }

        public int? EntityId { get; set; }

        [StringLength(2000)]
        public string? Details { get; set; }

        [StringLength(50)]
        public string? IpAddress { get; set; }

        [StringLength(255)]
        public string? Path { get; set; }

        public virtual User? Actor { get; set; }
    }
}
