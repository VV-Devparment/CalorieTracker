using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;
using CalorieTracker.Server.Models;

namespace CalorieTracker.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("profile")]
        public async Task<ActionResult<UserProfileDto>> GetProfile()
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "Користувача не знайдено" });
                }

                var profileDto = new UserProfileDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    Age = user.Age,
                    Weight = user.Weight,
                    Height = user.Height,
                    Gender = user.Gender,
                    ActivityLevel = user.ActivityLevel,
                    DailyCalorieGoal = user.DailyCalorieGoal,
                    CreatedAt = user.CreatedAt
                };

                return Ok(profileDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні профілю", error = ex.Message });
            }
        }

        [HttpPut("profile")]
        public async Task<ActionResult<UserProfileDto>> UpdateProfile(UserUpdateDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "Користувача не знайдено" });
                }

                // Оновлюємо дані користувача
                if (!string.IsNullOrEmpty(dto.Name))
                    user.Name = dto.Name;

                if (dto.Age.HasValue)
                    user.Age = dto.Age.Value;

                if (dto.Weight.HasValue)
                    user.Weight = dto.Weight.Value;

                if (dto.Height.HasValue)
                    user.Height = dto.Height.Value;

                if (!string.IsNullOrEmpty(dto.Gender))
                    user.Gender = dto.Gender;

                if (dto.ActivityLevel.HasValue)
                    user.ActivityLevel = dto.ActivityLevel.Value;

                if (dto.DailyCalorieGoal.HasValue)
                    user.DailyCalorieGoal = dto.DailyCalorieGoal.Value;

                // ⭐ ЗАКОМЕНТОВАНО: Тригер автоматично оновить UpdatedAt
                // user.UpdatedAt = DateTime.UtcNow;

                // Пересчитуємо денну норму калорій якщо змінилися параметри
                if (user.Age.HasValue && user.Weight.HasValue && user.Height.HasValue && !string.IsNullOrEmpty(user.Gender))
                {
                    user.DailyCalorieGoal = CalculateDailyCalorieGoal(
                        user.Age.Value,
                        user.Weight.Value,
                        user.Height.Value,
                        user.Gender,
                        user.ActivityLevel
                    );
                }

                await _context.SaveChangesAsync();

                var profileDto = new UserProfileDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    Age = user.Age,
                    Weight = user.Weight,
                    Height = user.Height,
                    Gender = user.Gender,
                    ActivityLevel = user.ActivityLevel,
                    DailyCalorieGoal = user.DailyCalorieGoal,
                    CreatedAt = user.CreatedAt
                };

                return Ok(profileDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при оновленні профілю", error = ex.Message });
            }
        }

        [HttpPost("weight")]
        public async Task<ActionResult> AddWeightRecord([FromBody] decimal weight)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var today = DateOnly.FromDateTime(DateTime.UtcNow);

                // Спочатку оновлюємо вагу в профілі користувача
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    user.Weight = weight;
                    // ⭐ ЗАКОМЕНТОВАНО: Тригер автоматично оновить UpdatedAt
                    // user.UpdatedAt = DateTime.UtcNow;
                }

                // Потім обробляємо запис ваги
                var existingRecord = await _context.WeightRecords
                    .FirstOrDefaultAsync(wr => wr.UserId == userId && wr.RecordDate == today);

                if (existingRecord != null)
                {
                    // Оновлюємо існуючий запис
                    existingRecord.Weight = weight;
                }
                else
                {
                    // Створюємо новий запис
                    var weightRecord = new WeightRecord
                    {
                        UserId = userId,
                        Weight = weight,
                        RecordDate = today,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.WeightRecords.Add(weightRecord);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Вага успішно записана", weight });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при записі ваги", error = ex.Message });
            }
        }

        [HttpGet("weight-history")]
        public async Task<ActionResult<IEnumerable<object>>> GetWeightHistory([FromQuery] int days = 30)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var startDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));

                var weightRecords = await _context.WeightRecords
                    .Where(wr => wr.UserId == userId && wr.RecordDate >= startDate)
                    .OrderBy(wr => wr.RecordDate)
                    .Select(wr => new
                    {
                        Date = wr.RecordDate,
                        Weight = wr.Weight
                    })
                    .ToListAsync();

                return Ok(weightRecords);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні історії ваги", error = ex.Message });
            }
        }

        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetUserStatistics([FromQuery] int days = 7)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var startDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));
                var endDate = DateOnly.FromDateTime(DateTime.UtcNow);

                // Отримуємо статистику по днях
                var dailyStats = await _context.Meals
                    .Include(m => m.Items)
                    .Where(m => m.UserId == userId && m.Date >= startDate && m.Date <= endDate)
                    .GroupBy(m => m.Date)
                    .Select(g => new
                    {
                        Date = g.Key,
                        TotalCalories = g.SelectMany(m => m.Items)
                                        .Sum(mi => mi.Quantity * mi.CaloriesPer100g / 100),
                        TotalProtein = g.SelectMany(m => m.Items)
                                       .Sum(mi => mi.Quantity * mi.ProteinPer100g / 100),
                        TotalFats = g.SelectMany(m => m.Items)
                                    .Sum(mi => mi.Quantity * mi.FatsPer100g / 100),
                        TotalCarbs = g.SelectMany(m => m.Items)
                                     .Sum(mi => mi.Quantity * mi.CarbsPer100g / 100),
                        MealsCount = g.Count()
                    })
                    .OrderBy(ds => ds.Date)
                    .ToListAsync();

                // Загальна статистика за період
                var totalStats = new
                {
                    AverageCalories = dailyStats.Any() ? dailyStats.Average(ds => (double)ds.TotalCalories) : 0,
                    AverageProtein = dailyStats.Any() ? dailyStats.Average(ds => (double)ds.TotalProtein) : 0,
                    AverageFats = dailyStats.Any() ? dailyStats.Average(ds => (double)ds.TotalFats) : 0,
                    AverageCarbs = dailyStats.Any() ? dailyStats.Average(ds => (double)ds.TotalCarbs) : 0,
                    TotalMeals = dailyStats.Sum(ds => ds.MealsCount),
                    DaysWithData = dailyStats.Count
                };

                var response = new
                {
                    DailyStats = dailyStats,
                    Summary = totalStats
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні статистики", error = ex.Message });
            }
        }

        private int CalculateDailyCalorieGoal(int age, decimal weight, decimal height, string gender, int activityLevel)
        {
            // Формула Міффліна-Сан Жеора для розрахунку BMR
            decimal bmr;

            if (gender.ToLower() == "male")
            {
                bmr = (10 * weight) + (6.25m * height) - (5 * age) + 5;
            }
            else
            {
                bmr = (10 * weight) + (6.25m * height) - (5 * age) - 161;
            }

            // Множники активності
            decimal activityMultiplier = activityLevel switch
            {
                1 => 1.2m,   // Сидячий спосіб життя
                2 => 1.375m, // Легка активність
                3 => 1.55m,  // Помірна активність
                4 => 1.725m, // Висока активність
                5 => 1.9m,   // Дуже висока активність
                _ => 1.2m
            };

            return (int)Math.Round(bmr * activityMultiplier);
        }
    }
}