using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.DTOs;

namespace CalorieTracker.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/logs")]
    [Authorize(Roles = "Admin")]
    public class AdminLogsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminLogsController(AppDbContext db) { _db = db; }

        [HttpGet]
        public async Task<ActionResult<object>> List(
            [FromQuery] string? level,
            [FromQuery] string? action,
            [FromQuery] int? actorUserId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 50;

            var q = _db.AuditLogs.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(level))   q = q.Where(l => l.Level == level);
            if (!string.IsNullOrWhiteSpace(action))  q = q.Where(l => l.Action == action);
            if (actorUserId.HasValue)                q = q.Where(l => l.ActorUserId == actorUserId.Value);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(l => l.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new AdminAuditLogDto
                {
                    Id = l.Id,
                    Timestamp = l.Timestamp,
                    Level = l.Level,
                    Action = l.Action,
                    ActorUserId = l.ActorUserId,
                    ActorEmail = l.ActorEmail,
                    EntityType = l.EntityType,
                    EntityId = l.EntityId,
                    Details = l.Details,
                    IpAddress = l.IpAddress,
                    Path = l.Path,
                })
                .ToListAsync();

            return Ok(new { items, total, page, pageSize });
        }
    }
}
