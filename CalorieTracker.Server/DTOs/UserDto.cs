using System.ComponentModel.DataAnnotations;

namespace CalorieTracker.Server.DTOs
{
    public class UserRegistrationDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public DateOnly? DateOfBirth { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public string? Gender { get; set; }
        public int ActivityLevel { get; set; } = 1;
    }

    public class UserLoginDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public string? Gender { get; set; }
        public int ActivityLevel { get; set; }
        public int? DailyCalorieGoal { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UserUpdateDto
    {
        [StringLength(100)]
        public string? Name { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        // Weight is NOT updated here — use POST /users/weight to record a new weight (3NF)
        // Height is NOT updated here — use POST /users/weight to record height with weight (3NF)
        public string? Gender { get; set; }
        public int? ActivityLevel { get; set; }
        // DailyCalorieGoal is NOT stored — it is computed from anthropometrics (3NF)
    }

    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public UserProfileDto User { get; set; } = null!;
    }
    // Додайте цей клас в UserDto.cs

    public class WeightRequestDto
    {
        [Required]
        [Range(1, 999.99)]
        public decimal Weight { get; set; }

        [Range(50, 300)]
        public decimal? Height { get; set; } // необов'язково — оновлюється разом з вагою
    }
}
