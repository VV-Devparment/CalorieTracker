using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;
using CalorieTracker.Server.Models;
using CalorieTracker.Server.Services;

namespace CalorieTracker.Server.Controllers.Admin
{
    /// <summary>
    /// Адмін-операції над досягненнями.
    /// ВАЖЛИВО: визначення (Code → Title/Description/Icon) зашиті в AchievementService.AllDefinitions.
    /// Тому тут ми не CRUD-имо самі визначення, а лише вручну видаємо/відкликаємо їх для юзерів.
    /// Якщо знадобиться повний CRUD — треба перенести Definitions у БД (окрема міграція).
    /// </summary>
    [ApiController]
    [Route("api/admin/achievements")]
    [Authorize(Roles = "Admin")]
    public class AdminAchievementsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuditService _audit;

        public AdminAchievementsController(AppDbContext db, IAuditService audit)
        {
            _db = db;
            _audit = audit;
        }

        [HttpGet("definitions")]
        public async Task<ActionResult<List<AdminAchievementDefinitionDto>>> Definitions()
        {
            // Кількість юзерів на кожен Code. Унікальний індекс (UserId, Code) гарантує,
            // що кожен юзер з'являється не більше одного разу — простий Count() = distinct users.
            var counts = await _db.Achievements
                .GroupBy(a => a.Code)
                .Select(g => new { Code = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Code, x => x.Count);

            var result = AchievementService.AllDefinitions.Select(d => new AdminAchievementDefinitionDto
            {
                Code = d.Code,
                Title = d.Title,
                Description = d.Description,
                IconName = d.IconName,
                Category = d.Category,
                UnlockedByUsers = counts.TryGetValue(d.Code, out var c) ? c : 0,
            }).ToList();
            return Ok(result);
        }

        [HttpGet("user/{userId:int}")]
        public async Task<ActionResult<List<object>>> GetUserAchievements(int userId)
        {
            var unlocked = await _db.Achievements
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.UnlockedAt)
                .Select(a => new { a.Code, a.UnlockedAt })
                .ToListAsync();
            return Ok(unlocked);
        }

        [HttpPost("award")]
        public async Task<IActionResult> Award([FromBody] AwardAchievementDto dto)
        {
            var def = AchievementService.AllDefinitions.FirstOrDefault(d => d.Code == dto.Code);
            if (def == null) return BadRequest(new { message = "Невідомий код досягнення" });

            var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
            if (!userExists) return NotFound(new { message = "Користувача не знайдено" });

            var already = await _db.Achievements.AnyAsync(a => a.UserId == dto.UserId && a.Code == dto.Code);
            if (already) return Conflict(new { message = "Це досягнення вже видане" });

            _db.Achievements.Add(new Achievement
            {
                UserId = dto.UserId,
                Code = dto.Code,
                UnlockedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();

            await _audit.LogAsync("ACHIEVEMENT_AWARDED", "Achievement", dto.UserId, $"code={dto.Code}");
            return NoContent();
        }

        [HttpDelete("revoke/{userId:int}/{code}")]
        public async Task<IActionResult> Revoke(int userId, string code)
        {
            var entry = await _db.Achievements.FirstOrDefaultAsync(a => a.UserId == userId && a.Code == code);
            if (entry == null) return NotFound();

            _db.Achievements.Remove(entry);
            await _db.SaveChangesAsync();

            await _audit.LogAsync("ACHIEVEMENT_REVOKED", "Achievement", userId, $"code={code}");
            return NoContent();
        }
    }
}
