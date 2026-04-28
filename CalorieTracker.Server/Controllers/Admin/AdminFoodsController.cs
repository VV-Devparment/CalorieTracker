using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;
using CalorieTracker.Server.Services;

namespace CalorieTracker.Server.Controllers.Admin
{
    /// <summary>
    /// Модерація custom foods від ВСІХ користувачів.
    /// На відміну від FoodsController.GetFoods — без фільтра CreatedBy.
    /// </summary>
    [ApiController]
    [Route("api/admin/foods")]
    [Authorize(Roles = "Admin")]
    public class AdminFoodsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuditService _audit;

        public AdminFoodsController(AppDbContext db, IAuditService audit)
        {
            _db = db;
            _audit = audit;
        }

        [HttpGet]
        public async Task<ActionResult<object>> List(
            [FromQuery] string? search,
            [FromQuery] int? userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var q = _db.Foods.AsNoTracking().Where(f => f.IsCustom);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{search}%";
                q = q.Where(f => EF.Functions.ILike(f.Name, pattern) ||
                                 (f.Brand != null && EF.Functions.ILike(f.Brand, pattern)));
            }
            if (userId.HasValue) q = q.Where(f => f.CreatedBy == userId.Value);

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(f => f.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(f => new AdminFoodDto
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
                    CreatedAt = f.CreatedAt,
                    CreatedBy = f.CreatedBy,
                    CreatedByEmail = f.Creator != null ? f.Creator.Email : null,
                    CreatedByName = f.Creator != null ? f.Creator.Name : null,
                })
                .ToListAsync();

            return Ok(new { items, total, page, pageSize });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] FoodCreateDto dto)
        {
            var f = await _db.Foods.FindAsync(id);
            if (f == null) return NotFound();
            if (!f.IsCustom) return BadRequest(new { message = "Можна редагувати тільки custom-продукти" });

            f.Name = dto.Name;
            f.Brand = dto.Brand;
            f.CaloriesPer100g = dto.CaloriesPer100g;
            f.ProteinPer100g = dto.ProteinPer100g;
            f.FatsPer100g = dto.FatsPer100g;
            f.CarbsPer100g = dto.CarbsPer100g;
            f.FiberPer100g = dto.FiberPer100g;
            f.SugarPer100g = dto.SugarPer100g;
            f.SodiumPer100g = dto.SodiumPer100g;
            f.Category = dto.Category;
            f.Barcode = dto.Barcode;
            await _db.SaveChangesAsync();

            await _audit.LogAsync("FOOD_EDITED", "Food", id, $"name={dto.Name}");
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var f = await _db.Foods.FindAsync(id);
            if (f == null) return NotFound();
            if (!f.IsCustom) return BadRequest(new { message = "Можна видаляти тільки custom-продукти" });

            _db.Foods.Remove(f);
            await _db.SaveChangesAsync();

            await _audit.LogAsync("FOOD_DELETED", "Food", id, $"name={f.Name}");
            return NoContent();
        }
    }
}
