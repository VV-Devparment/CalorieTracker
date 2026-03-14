using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;
using CalorieTracker.Server.Models;
using CalorieTracker.Server.Services;
using System.Security.Claims;

namespace CalorieTracker.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FoodsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ExternalFoodService _externalFoodService;

        public FoodsController(AppDbContext context, ExternalFoodService externalFoodService)
        {
            _context = context;
            _externalFoodService = externalFoodService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FoodDto>>> GetFoods([FromQuery] FoodSearchDto searchDto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                // Завжди повертаємо тільки власні продукти поточного користувача
                var query = _context.Foods
                    .Where(f => f.IsCustom && f.CreatedBy == userId)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(searchDto.Query))
                {
                    query = query.Where(f => f.Name.Contains(searchDto.Query) ||
                                            (f.Brand != null && f.Brand.Contains(searchDto.Query)));
                }

                if (!string.IsNullOrEmpty(searchDto.Category))
                {
                    query = query.Where(f => f.Category == searchDto.Category);
                }

                query = query.OrderBy(f => f.Name);

                var totalCount = await query.CountAsync();
                var foods = await query
                    .Skip((searchDto.Page - 1) * searchDto.PageSize)
                    .Take(searchDto.PageSize)
                    .Select(f => new FoodDto
                    {
                        Id = f.Id,
                        Name = f.Name,
                        Brand = f.Brand,
                        CaloriesPer100g = f.CaloriesPer100g,
                        ProteinPer100g = f.ProteinPer100g,
                        FatsPer100g = f.FatsPer100g,
                        CarbsPer100g = f.CarbsPer100g,
                        FiberPer100g = f.FiberPer100g,
                        SugarPer100g = f.SugarPer100g,
                        SodiumPer100g = f.SodiumPer100g,
                        Category = f.Category,
                        Barcode = f.Barcode,
                        IsCustom = true,
                        IsUserGenerated = true,
                    })
                    .ToListAsync();

                Response.Headers.Add("X-Total-Count", totalCount.ToString());
                return Ok(foods);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні продуктів", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FoodDto>> GetFood(int id)
        {
            try
            {
                var food = await _context.Foods.FindAsync(id);

                if (food == null)
                {
                    return NotFound(new { message = "Продукт не знайдено" });
                }

                var foodDto = new FoodDto
                {
                    Id = food.Id,
                    Name = food.Name,
                    Brand = food.Brand,
                    CaloriesPer100g = food.CaloriesPer100g,
                    ProteinPer100g = food.ProteinPer100g,
                    FatsPer100g = food.FatsPer100g,
                    CarbsPer100g = food.CarbsPer100g,
                    FiberPer100g = food.FiberPer100g,
                    SugarPer100g = food.SugarPer100g,
                    SodiumPer100g = food.SodiumPer100g,
                    Category = food.Category,
                    Barcode = food.Barcode,
                    IsCustom = food.IsCustom
                };

                return Ok(foodDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні продукту", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<FoodDto>> CreateFood(FoodCreateDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var food = new Food
                {
                    Name = dto.Name,
                    Brand = dto.Brand,
                    CaloriesPer100g = dto.CaloriesPer100g,
                    ProteinPer100g = dto.ProteinPer100g,
                    FatsPer100g = dto.FatsPer100g,
                    CarbsPer100g = dto.CarbsPer100g,
                    FiberPer100g = dto.FiberPer100g,
                    SugarPer100g = dto.SugarPer100g,
                    SodiumPer100g = dto.SodiumPer100g,
                    Category = dto.Category,
                    Barcode = dto.Barcode,
                    IsCustom = true,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Foods.Add(food);
                await _context.SaveChangesAsync();

                var foodDto = new FoodDto
                {
                    Id = food.Id,
                    Name = food.Name,
                    Brand = food.Brand,
                    CaloriesPer100g = food.CaloriesPer100g,
                    ProteinPer100g = food.ProteinPer100g,
                    FatsPer100g = food.FatsPer100g,
                    CarbsPer100g = food.CarbsPer100g,
                    FiberPer100g = food.FiberPer100g,
                    SugarPer100g = food.SugarPer100g,
                    SodiumPer100g = food.SodiumPer100g,
                    Category = food.Category,
                    Barcode = food.Barcode,
                    IsCustom = food.IsCustom
                };

                return CreatedAtAction(nameof(GetFood), new { id = food.Id }, foodDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при створенні продукту", error = ex.Message });
            }
        }

        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<string>>> GetCategories()
        {
            try
            {
                var categories = await _context.Foods
                    .Where(f => f.Category != null)
                    .Select(f => f.Category!)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToListAsync();

                return Ok(categories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при отриманні категорій", error = ex.Message });
            }
        }

        [HttpGet("search/{query}")]
        public async Task<ActionResult<IEnumerable<FoodDto>>> SearchFoods(string query)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var foods = await _context.Foods
                    .Where(f => f.IsCustom && f.CreatedBy == userId &&
                               (f.Name.Contains(query) || (f.Brand != null && f.Brand.Contains(query))))
                    .Take(20)
                    .Select(f => new FoodDto
                    {
                        Id = f.Id,
                        Name = f.Name,
                        Brand = f.Brand,
                        CaloriesPer100g = f.CaloriesPer100g,
                        ProteinPer100g = f.ProteinPer100g,
                        FatsPer100g = f.FatsPer100g,
                        CarbsPer100g = f.CarbsPer100g,
                        FiberPer100g = f.FiberPer100g,
                        SugarPer100g = f.SugarPer100g,
                        SodiumPer100g = f.SodiumPer100g,
                        Category = f.Category,
                        Barcode = f.Barcode,
                        IsCustom = true,
                        IsUserGenerated = true,
                    })
                    .ToListAsync();

                return Ok(foods);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при пошуку продуктів", error = ex.Message });
            }
        }
        // Додай ці методи в FoodsController.cs

        [HttpPut("{id}")]
        public async Task<ActionResult<FoodDto>> UpdateFood(int id, FoodCreateDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var food = await _context.Foods.FindAsync(id);
                if (food == null)
                {
                    return NotFound(new { message = "Продукт не знайдено" });
                }

                // Перевіряємо чи користувач може редагувати цей продукт
                if (!food.IsCustom || food.CreatedBy != userId)
                {
                    return Forbid("Ви можете редагувати тільки свої продукти");
                }

                // Оновлюємо дані продукту
                food.Name = dto.Name;
                food.Brand = dto.Brand;
                food.CaloriesPer100g = dto.CaloriesPer100g;
                food.ProteinPer100g = dto.ProteinPer100g;
                food.FatsPer100g = dto.FatsPer100g;
                food.CarbsPer100g = dto.CarbsPer100g;
                food.FiberPer100g = dto.FiberPer100g;
                food.SugarPer100g = dto.SugarPer100g;
                food.SodiumPer100g = dto.SodiumPer100g;
                food.Category = dto.Category;
                food.Barcode = dto.Barcode;

                await _context.SaveChangesAsync();

                var foodDto = new FoodDto
                {
                    Id = food.Id,
                    Name = food.Name,
                    Brand = food.Brand,
                    CaloriesPer100g = food.CaloriesPer100g,
                    ProteinPer100g = food.ProteinPer100g,
                    FatsPer100g = food.FatsPer100g,
                    CarbsPer100g = food.CarbsPer100g,
                    FiberPer100g = food.FiberPer100g,
                    SugarPer100g = food.SugarPer100g,
                    SodiumPer100g = food.SodiumPer100g,
                    Category = food.Category,
                    Barcode = food.Barcode,
                    IsCustom = true
                };

                return Ok(foodDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при оновленні продукту", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteFood(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");

                var food = await _context.Foods.FindAsync(id);
                if (food == null)
                {
                    return NotFound(new { message = "Продукт не знайдено" });
                }

                // Перевіряємо чи користувач може видалити цей продукт
                if (!food.IsCustom || food.CreatedBy != userId)
                {
                    return Forbid("Ви можете видаляти тільки свої продукти");
                }

                _context.Foods.Remove(food);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при видаленні продукту", error = ex.Message });
            }
        }

        // ─── Зовнішні API ─────────────────────────────────────────────────

        [HttpGet("external/search")]
        public async Task<ActionResult<IEnumerable<ExternalFoodDto>>> SearchExternal(
            [FromQuery] string query,
            [FromQuery] string source = "usda")
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "Вкажіть запит для пошуку" });

            try
            {
                var results = await _externalFoodService.SearchByNameAsync(query, source);
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при пошуку у зовнішній базі", error = ex.Message });
            }
        }

        [HttpGet("external/barcode/{barcode}")]
        public async Task<ActionResult<ExternalFoodDto>> SearchByBarcode(string barcode)
        {
            try
            {
                var result = await _externalFoodService.SearchByBarcodeAsync(barcode);
                if (result == null)
                    return NotFound(new { message = "Продукт за цим штрих-кодом не знайдено" });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Помилка при пошуку за штрих-кодом", error = ex.Message });
            }
        }

        private static FoodDto MapToFoodDto(Food food) => new()
        {
            Id = food.Id,
            Name = food.Name,
            Brand = food.Brand,
            CaloriesPer100g = food.CaloriesPer100g,
            ProteinPer100g = food.ProteinPer100g,
            FatsPer100g = food.FatsPer100g,
            CarbsPer100g = food.CarbsPer100g,
            FiberPer100g = food.FiberPer100g,
            SugarPer100g = food.SugarPer100g,
            SodiumPer100g = food.SodiumPer100g,
            Category = food.Category,
            Barcode = food.Barcode,
            IsCustom = food.IsCustom,
            IsUserGenerated = food.IsCustom
        };
    }
}