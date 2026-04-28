using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;

namespace CalorieTracker.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/stats")]
    [Authorize(Roles = "Admin")]
    public class AdminStatsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminStatsController(AppDbContext db) { _db = db; }

        [HttpGet]
        public async Task<ActionResult<AdminStatsDto>> Get()
        {
            var now = DateTime.UtcNow;
            var dayAgo = now.AddDays(-1);
            var weekAgo = now.AddDays(-7);
            var monthAgo = now.AddDays(-30);

            // "Активний" = є хоча б один Meal, створений у цьому вікні.
            // Грубий, але дешевий proxy без окремої колонки LastSeen.
            var activeDay = await _db.Meals.Where(m => m.CreatedAt >= dayAgo)
                                   .Select(m => m.UserId).Distinct().CountAsync();
            var activeWeek = await _db.Meals.Where(m => m.CreatedAt >= weekAgo)
                                    .Select(m => m.UserId).Distinct().CountAsync();
            var activeMonth = await _db.Meals.Where(m => m.CreatedAt >= monthAgo)
                                     .Select(m => m.UserId).Distinct().CountAsync();

            var signups = await _db.Users
                .Where(u => u.CreatedAt >= monthAgo)
                .GroupBy(u => DateOnly.FromDateTime(u.CreatedAt))
                .Select(g => new DailySignupDto { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var dto = new AdminStatsDto
            {
                TotalUsers = await _db.Users.CountAsync(),
                BlockedUsers = await _db.Users.CountAsync(u => u.IsBlocked),
                Admins = await _db.Users.CountAsync(u => u.Role == "Admin"),
                ActiveDay = activeDay,
                ActiveWeek = activeWeek,
                ActiveMonth = activeMonth,
                NewUsersWeek = await _db.Users.CountAsync(u => u.CreatedAt >= weekAgo),
                NewUsersMonth = await _db.Users.CountAsync(u => u.CreatedAt >= monthAgo),
                TotalMeals = await _db.Meals.CountAsync(),
                TotalCustomFoods = await _db.Foods.CountAsync(f => f.IsCustom),
                TotalAchievements = await _db.Achievements.CountAsync(),
                ApiErrors24h = await _db.AuditLogs.CountAsync(a => a.Level == "Error" && a.Timestamp >= dayAgo),
                SignupsLast30Days = signups.OrderBy(s => s.Date).ToList(),
            };

            return Ok(dto);
        }
    }
}
