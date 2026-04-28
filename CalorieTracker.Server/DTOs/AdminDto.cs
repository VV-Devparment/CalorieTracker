using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.DTOs
{
    public class AdminUserListItemDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public bool IsBlocked { get; set; }
        public DateTime? BlockedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastActivityAt { get; set; } // максимум CreatedAt у Meals (грубий proxy)
        public int MealsCount { get; set; }
        public int CustomFoodsCount { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class AdminUserDetailsDto : AdminUserListItemDto
    {
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public int ActivityLevel { get; set; }
        public string? BlockedReason { get; set; }
        public int WeightRecordsCount { get; set; }
        public int AchievementsCount { get; set; }
    }

    public class BlockUserDto
    {
        [StringLength(500)]
        public string? Reason { get; set; }
    }

    public class AdminFoodDto
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
        public DateTime CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public string? CreatedByEmail { get; set; }
        public string? CreatedByName { get; set; }
    }

    public class AdminStatsDto
    {
        public int TotalUsers { get; set; }
        public int BlockedUsers { get; set; }
        public int Admins { get; set; }
        public int ActiveDay { get; set; }   // активні за 24 год (ті, у кого є Meal з UpdatedAt/CreatedAt сьогодні)
        public int ActiveWeek { get; set; }
        public int ActiveMonth { get; set; } // MAU
        public int NewUsersWeek { get; set; }
        public int NewUsersMonth { get; set; }
        public int TotalMeals { get; set; }
        public int TotalCustomFoods { get; set; }
        public int TotalAchievements { get; set; }
        public int ApiErrors24h { get; set; }
        public List<DailySignupDto> SignupsLast30Days { get; set; } = new();
    }

    public class DailySignupDto
    {
        public DateOnly Date { get; set; }
        public int Count { get; set; }
    }

    public class AwardAchievementDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;
    }

    public class AdminAchievementDefinitionDto
    {
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string IconName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int UnlockedByUsers { get; set; }
    }

    public class AdminAuditLogDto
    {
        public int Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Level { get; set; } = "Info";
        public string Action { get; set; } = string.Empty;
        public int? ActorUserId { get; set; }
        public string? ActorEmail { get; set; }
        public string? EntityType { get; set; }
        public int? EntityId { get; set; }
        public string? Details { get; set; }
        public string? IpAddress { get; set; }
        public string? Path { get; set; }
    }
}
