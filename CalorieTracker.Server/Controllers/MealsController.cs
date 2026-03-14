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
    public class MealsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MealsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("daily/{date}")]
        public async Task<ActionResult<DailyMealsDto>> GetDailyMeals(string date)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                if (!DateOnly.TryParse(date, out var parsedDate))
                    return BadRequest(new { message = "Невірний формат дати" });

                var meals = await _context.Meals
                    .Include(m => m.Items)
                    .Where(m => m.UserId == userId && m.Date == parsedDate)
                    .OrderBy(m => m.MealType)
                    .ToListAsync();

                var mealDtos = meals.Select(m => BuildMealDto(m)).ToList();

                var user = await _context.Users.FindAsync(userId);

                var summary = new DailyNutritionSummaryDto
                {
                    TotalCalories = mealDtos.Sum(m => m.TotalCalories),
                    TotalProtein  = mealDtos.Sum(m => m.TotalProtein),
                    TotalFats     = mealDtos.Sum(m => m.TotalFats),
                    TotalCarbs    = mealDtos.Sum(m => m.TotalCarbs),
                    DailyCalorieGoal = user?.DailyCalorieGoal
                };

                return Ok(new DailyMealsDto { Date = parsedDate, Meals = mealDtos, Summary = summary });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні прийомів їжі", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MealDto>> GetMeal(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var meal = await _context.Meals
                    .Include(m => m.Items)
                    .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);

                if (meal == null)
                    return NotFound(new { message = "Прийом їжі не знайдено" });

                return Ok(BuildMealDto(meal));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні прийому їжі", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<MealDto>> CreateMeal(MealCreateDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                // Якщо прийом їжі вже існує — додаємо продукти до нього
                var existingMeal = await _context.Meals
                    .Include(m => m.Items)
                    .FirstOrDefaultAsync(m => m.UserId == userId && m.Date == dto.Date && m.MealType == dto.MealType);

                if (existingMeal != null)
                {
                    if (dto.Items.Any())
                    {
                        _context.MealItems.AddRange(dto.Items.Select(item => BuildMealItem(existingMeal.Id, item)));
                        await _context.SaveChangesAsync();

                        // Reload items
                        await _context.Entry(existingMeal).Collection(m => m.Items).LoadAsync();
                    }
                    return Ok(BuildMealDto(existingMeal));
                }

                // Створюємо новий прийом їжі
                var meal = new Meal
                {
                    UserId = userId,
                    Date = dto.Date,
                    MealType = dto.MealType,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Meals.Add(meal);
                await _context.SaveChangesAsync();

                if (dto.Items.Any())
                {
                    _context.MealItems.AddRange(dto.Items.Select(item => BuildMealItem(meal.Id, item)));
                    await _context.SaveChangesAsync();

                    await _context.Entry(meal).Collection(m => m.Items).LoadAsync();
                }

                return CreatedAtAction(nameof(GetMeal), new { id = meal.Id }, BuildMealDto(meal));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при створенні прийому їжі", error = ex.Message });
            }
        }

        [HttpPost("{id}/items")]
        public async Task<ActionResult<MealItemDto>> AddFoodToMeal(int id, AddFoodToMealDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var meal = await _context.Meals.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
                if (meal == null)
                    return NotFound(new { message = "Прийом їжі не знайдено" });

                var mealItem = BuildMealItem(id, dto);
                _context.MealItems.Add(mealItem);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetMeal), new { id = meal.Id }, BuildMealItemDto(mealItem));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при додаванні продукту", error = ex.Message });
            }
        }

        [HttpPut("items/{itemId}/quantity")]
        public async Task<ActionResult> UpdateMealItemQuantity(int itemId, [FromBody] UpdateMealItemDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var mealItem = await _context.MealItems
                    .Include(mi => mi.Meal)
                    .FirstOrDefaultAsync(mi => mi.Id == itemId && mi.Meal.UserId == userId);

                if (mealItem == null)
                    return NotFound(new { message = "Елемент прийому їжі не знайдено" });

                mealItem.Quantity = dto.Quantity;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Кількість оновлено успішно" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при оновленні кількості", error = ex.Message });
            }
        }

        [HttpDelete("items/{itemId}")]
        public async Task<ActionResult> RemoveFoodFromMeal(int itemId)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var mealItem = await _context.MealItems
                    .Include(mi => mi.Meal)
                    .FirstOrDefaultAsync(mi => mi.Id == itemId && mi.Meal.UserId == userId);

                if (mealItem == null)
                    return NotFound(new { message = "Елемент прийому їжі не знайдено" });

                _context.MealItems.Remove(mealItem);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при видаленні продукту", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteMeal(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var meal = await _context.Meals
                    .Include(m => m.Items)
                    .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);

                if (meal == null)
                    return NotFound(new { message = "Прийом їжі не знайдено" });

                _context.Meals.Remove(meal);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при видаленні прийому їжі", error = ex.Message });
            }
        }

        // ── Helpers ─────────────────────────────────────────────────────

        private static MealItem BuildMealItem(int mealId, MealItemCreateDto dto) => new()
        {
            MealId         = mealId,
            FoodName       = dto.FoodName,
            FoodBrand      = dto.FoodBrand,
            CaloriesPer100g = dto.CaloriesPer100g,
            ProteinPer100g  = dto.ProteinPer100g,
            FatsPer100g     = dto.FatsPer100g,
            CarbsPer100g    = dto.CarbsPer100g,
            FiberPer100g    = dto.FiberPer100g,
            ExternalId      = dto.ExternalId,
            Source          = dto.Source,
            Quantity        = dto.Quantity,
            CreatedAt       = DateTime.UtcNow
        };

        private static MealItemDto BuildMealItemDto(MealItem mi) => new()
        {
            Id             = mi.Id,
            MealId         = mi.MealId,
            FoodName       = mi.FoodName,
            FoodBrand      = mi.FoodBrand,
            CaloriesPer100g = mi.CaloriesPer100g,
            ProteinPer100g  = mi.ProteinPer100g,
            FatsPer100g     = mi.FatsPer100g,
            CarbsPer100g    = mi.CarbsPer100g,
            Quantity        = mi.Quantity,
            Calories        = mi.Calories,
            Protein         = mi.Protein,
            Fats            = mi.Fats,
            Carbs           = mi.Carbs,
            ExternalId      = mi.ExternalId,
            Source          = mi.Source
        };

        private static MealDto BuildMealDto(Meal meal)
        {
            var dto = new MealDto
            {
                Id        = meal.Id,
                UserId    = meal.UserId,
                Date      = meal.Date,
                MealType  = meal.MealType,
                Items     = meal.Items.Select(BuildMealItemDto).ToList(),
                CreatedAt = meal.CreatedAt
            };
            dto.TotalCalories = dto.Items.Sum(i => i.Calories);
            dto.TotalProtein  = dto.Items.Sum(i => i.Protein);
            dto.TotalFats     = dto.Items.Sum(i => i.Fats);
            dto.TotalCarbs    = dto.Items.Sum(i => i.Carbs);
            return dto;
        }
    }
}
