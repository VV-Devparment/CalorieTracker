using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;
using CalorieTracker.Server.Services;

namespace CalorieTracker.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = "Admin")]
    public class AdminUsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuditService _audit;

        public AdminUsersController(AppDbContext db, IAuditService audit)
        {
            _db = db;
            _audit = audit;
        }

        [HttpGet]
        public async Task<ActionResult<object>> List(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] bool? blocked,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var q = _db.Users.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{search}%";
                q = q.Where(u => EF.Functions.ILike(u.Email, pattern) ||
                                 EF.Functions.ILike(u.Name, pattern));
            }
            if (!string.IsNullOrWhiteSpace(role)) q = q.Where(u => u.Role == role);
            if (blocked.HasValue) q = q.Where(u => u.IsBlocked == blocked.Value);

            var total = await q.CountAsync();

            // Спочатку — самі юзери на цій сторінці.
            // Активність/підрахунки — окремими агрегаціями (Postgres+EF не любить
            // підзапити з Max/Count у Select-проекції).
            var pageUsers = await q
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id, u.Email, u.Name, u.Role, u.IsBlocked, u.BlockedAt, u.CreatedAt,
                    HasAvatar = u.AvatarData != null && u.AvatarData.Length > 0,
                    u.AvatarUpdatedAt,
                })
                .ToListAsync();

            var ids = pageUsers.Select(u => u.Id).ToList();

            var lastActivity = await _db.Meals
                .Where(m => ids.Contains(m.UserId))
                .GroupBy(m => m.UserId)
                .Select(g => new { UserId = g.Key, Last = g.Max(m => m.CreatedAt) })
                .ToDictionaryAsync(x => x.UserId, x => (DateTime?)x.Last);

            var mealsCounts = await _db.Meals
                .Where(m => ids.Contains(m.UserId))
                .GroupBy(m => m.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count);

            var customFoodCounts = await _db.Foods
                .Where(f => f.IsCustom && f.CreatedBy != null && ids.Contains(f.CreatedBy.Value))
                .GroupBy(f => f.CreatedBy!.Value)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count);

            var items = pageUsers.Select(u => new AdminUserListItemDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                Role = u.Role,
                IsBlocked = u.IsBlocked,
                BlockedAt = u.BlockedAt,
                CreatedAt = u.CreatedAt,
                LastActivityAt = lastActivity.TryGetValue(u.Id, out var la) ? la : null,
                MealsCount = mealsCounts.TryGetValue(u.Id, out var mc) ? mc : 0,
                CustomFoodsCount = customFoodCounts.TryGetValue(u.Id, out var fc) ? fc : 0,
                AvatarUrl = u.HasAvatar ? BuildAvatarUrl(u.Id, u.AvatarUpdatedAt) : null,
            }).ToList();

            return Ok(new { items, total, page, pageSize });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<AdminUserDetailsDto>> Get(int id)
        {
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (u == null) return NotFound(new { message = "Користувача не знайдено" });

            var dto = new AdminUserDetailsDto
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                Role = u.Role,
                IsBlocked = u.IsBlocked,
                BlockedAt = u.BlockedAt,
                BlockedReason = u.BlockedReason,
                CreatedAt = u.CreatedAt,
                DateOfBirth = u.DateOfBirth,
                Gender = u.Gender,
                ActivityLevel = u.ActivityLevel,
                LastActivityAt = await _db.Meals.Where(m => m.UserId == id).MaxAsync(m => (DateTime?)m.CreatedAt),
                MealsCount = await _db.Meals.CountAsync(m => m.UserId == id),
                CustomFoodsCount = await _db.Foods.CountAsync(f => f.IsCustom && f.CreatedBy == id),
                WeightRecordsCount = await _db.WeightRecords.CountAsync(w => w.UserId == id),
                AchievementsCount = await _db.Achievements.CountAsync(a => a.UserId == id),
                AvatarUrl = (u.AvatarData != null && u.AvatarData.Length > 0)
                    ? BuildAvatarUrl(u.Id, u.AvatarUpdatedAt) : null,
            };
            return Ok(dto);
        }

        [HttpPost("{id:int}/block")]
        public async Task<IActionResult> Block(int id, [FromBody] BlockUserDto dto)
        {
            var u = await _db.Users.FindAsync(id);
            if (u == null) return NotFound();

            // Захист від самоблокування — інакше адмін може собі вистрелити в ногу.
            var actorId = GetActorId();
            if (actorId == id) return BadRequest(new { message = "Не можна заблокувати себе" });

            u.IsBlocked = true;
            u.BlockedAt = DateTime.UtcNow;
            u.BlockedReason = dto?.Reason;
            await _db.SaveChangesAsync();

            await _audit.LogAsync("USER_BLOCKED", "User", id, dto?.Reason);
            return NoContent();
        }

        [HttpPost("{id:int}/unblock")]
        public async Task<IActionResult> Unblock(int id)
        {
            var u = await _db.Users.FindAsync(id);
            if (u == null) return NotFound();

            u.IsBlocked = false;
            u.BlockedAt = null;
            u.BlockedReason = null;
            await _db.SaveChangesAsync();

            await _audit.LogAsync("USER_UNBLOCKED", "User", id);
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var actorId = GetActorId();
            if (actorId == id) return BadRequest(new { message = "Не можна видалити себе" });

            var u = await _db.Users.FindAsync(id);
            if (u == null) return NotFound();

            // Cascade у моделі: Meals, WeightRecords, Achievements видаляться автоматично.
            // Foods (CreatedBy) — SetNull, тобто залишаться як «осиротілі» кастомні продукти.
            _db.Users.Remove(u);
            await _db.SaveChangesAsync();

            await _audit.LogAsync("USER_DELETED", "User", id, $"email={u.Email}");
            return NoContent();
        }

        private int GetActorId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }

        private string BuildAvatarUrl(int userId, DateTime? updatedAt)
        {
            var version = updatedAt?.Ticks ?? 0;
            var req = HttpContext.Request;
            return $"{req.Scheme}://{req.Host}/api/users/{userId}/avatar?v={version}";
        }
    }
}
