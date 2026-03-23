using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;
using CalorieTracker.Server.Models;
using CalorieTracker.Server.Services;

namespace CalorieTracker.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuthService _authService;

        public AuthController(AppDbContext context, IAuthService authService)
        {
            _context = context;
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(UserRegistrationDto dto)
        {
            try
            {
                Console.WriteLine($"[REGISTER] Початок реєстрації для email: {dto.Email}");

                // Перевіряємо чи користувач вже існує
                if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                {
                    Console.WriteLine($"[REGISTER] Користувач з email {dto.Email} вже існує");
                    return BadRequest(new { message = "Користувач з таким email вже існує" });
                }

                Console.WriteLine($"[REGISTER] Створюємо нового користувача: {dto.Name}");

                // Створюємо нового користувача
                // Weight and DailyCalorieGoal are NOT stored in Users (3NF)
                var user = new User
                {
                    Email = dto.Email,
                    PasswordHash = _authService.HashPassword(dto.Password),
                    Name = dto.Name,
                    DateOfBirth = dto.DateOfBirth,
                    Height = dto.Height,
                    Gender = dto.Gender,
                    ActivityLevel = dto.ActivityLevel,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                Console.WriteLine("[REGISTER] Додаємо користувача до контексту");
                _context.Users.Add(user);

                Console.WriteLine("[REGISTER] Зберігаємо зміни в БД");
                var savedChanges = await _context.SaveChangesAsync();
                Console.WriteLine($"[REGISTER] Збережено {savedChanges} записів");

                // Перевіряємо чи користувач дійсно збережений
                var savedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (savedUser != null)
                {
                    Console.WriteLine($"[REGISTER] Користувач знайдений в БД з ID: {savedUser.Id}");
                    user.Id = savedUser.Id;
                }
                else
                {
                    Console.WriteLine("[REGISTER] ПОМИЛКА: Користувач не знайдений в БД після збереження!");
                }

                // If weight was provided at registration, create an initial WeightRecord (3NF)
                if (dto.Weight.HasValue)
                {
                    _context.WeightRecords.Add(new WeightRecord
                    {
                        UserId = user.Id,
                        Weight = dto.Weight.Value,
                        RecordDate = DateOnly.FromDateTime(DateTime.UtcNow),
                        CreatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"[REGISTER] Створено початковий запис ваги: {dto.Weight.Value} кг");
                }

                // DailyCalorieGoal is computed, not stored (3NF)
                int? dailyCalorieGoal = null;
                var regAge = ComputeAge(dto.DateOfBirth);
                if (regAge.HasValue && dto.Weight.HasValue && dto.Height.HasValue && !string.IsNullOrEmpty(dto.Gender))
                {
                    dailyCalorieGoal = CalculateDailyCalorieGoal(regAge.Value, dto.Weight.Value, dto.Height.Value, dto.Gender, dto.ActivityLevel);
                    Console.WriteLine($"[REGISTER] Розрахована денна норма: {dailyCalorieGoal} ккал");
                }

                Console.WriteLine($"[REGISTER] ID нового користувача: {user.Id}");

                // Генеруємо JWT токен
                var token = _authService.GenerateJwtToken(user);

                var response = new AuthResponseDto
                {
                    Token = token,
                    User = new UserProfileDto
                    {
                        Id = user.Id,
                        Email = user.Email,
                        Name = user.Name,
                        DateOfBirth = user.DateOfBirth,
                        Weight = dto.Weight,
                        Height = user.Height,
                        Gender = user.Gender,
                        ActivityLevel = user.ActivityLevel,
                        DailyCalorieGoal = dailyCalorieGoal,
                        CreatedAt = user.CreatedAt
                    }
                };

                Console.WriteLine($"[REGISTER] Успішна реєстрація користувача ID: {user.Id}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[REGISTER] Помилка: {ex.Message}");
                Console.WriteLine($"[REGISTER] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Помилка при реєстрації", error = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(UserLoginDto dto)
        {
            try
            {
                // Знаходимо користувача за email
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

                if (user == null)
                {
                    return BadRequest(new { message = "Невірний email або пароль" });
                }

                // Перевіряємо пароль
                if (!_authService.VerifyPassword(dto.Password, user.PasswordHash))
                {
                    return BadRequest(new { message = "Невірний email або пароль" });
                }

                // Генеруємо JWT токен
                var token = _authService.GenerateJwtToken(user);

                // Current weight from WeightRecord (3NF — not stored in Users)
                var latestWeightRecord = await _context.WeightRecords
                    .Where(wr => wr.UserId == user.Id)
                    .OrderByDescending(wr => wr.RecordDate)
                    .FirstOrDefaultAsync();

                decimal? currentWeight = latestWeightRecord?.Weight;

                // DailyCalorieGoal computed, not stored (3NF)
                int? dailyCalorieGoal = null;
                var loginAge = ComputeAge(user.DateOfBirth);
                if (loginAge.HasValue && currentWeight.HasValue && user.Height.HasValue && !string.IsNullOrEmpty(user.Gender))
                {
                    dailyCalorieGoal = CalculateDailyCalorieGoal(loginAge.Value, currentWeight.Value, user.Height.Value, user.Gender, user.ActivityLevel);
                }

                var response = new AuthResponseDto
                {
                    Token = token,
                    User = new UserProfileDto
                    {
                        Id = user.Id,
                        Email = user.Email,
                        Name = user.Name,
                        DateOfBirth = user.DateOfBirth,
                        Weight = currentWeight,
                        Height = user.Height,
                        Gender = user.Gender,
                        ActivityLevel = user.ActivityLevel,
                        DailyCalorieGoal = dailyCalorieGoal,
                        CreatedAt = user.CreatedAt
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при авторизації", error = ex.Message });
            }
        }

        private static int? ComputeAge(DateOnly? dateOfBirth)
        {
            if (!dateOfBirth.HasValue) return null;
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            int age = today.Year - dateOfBirth.Value.Year;
            if (dateOfBirth.Value > today.AddYears(-age)) age--;
            return age;
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