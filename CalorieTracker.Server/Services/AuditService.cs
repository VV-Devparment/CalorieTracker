using System.Security.Claims;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.Models;

namespace CalorieTracker.Server.Services
{
    public interface IAuditService
    {
        /// <summary>Адмінська або системна дія.</summary>
        Task LogAsync(string action, string? entityType = null, int? entityId = null,
                      string? details = null, string level = "Info");
    }

    /// <summary>
    /// Простий журнал у БД (таблиця AuditLogs).
    /// Не блокує запит — у разі провалу логу просто пишемо в _logger
    /// (журнал не повинен ламати основну дію).
    /// </summary>
    public class AuditService : IAuditService
    {
        private readonly AppDbContext _db;
        private readonly IHttpContextAccessor _http;
        private readonly ILogger<AuditService> _logger;

        public AuditService(AppDbContext db, IHttpContextAccessor http, ILogger<AuditService> logger)
        {
            _db = db;
            _http = http;
            _logger = logger;
        }

        public async Task LogAsync(string action, string? entityType = null, int? entityId = null,
                                   string? details = null, string level = "Info")
        {
            try
            {
                var ctx = _http.HttpContext;
                int? actorId = null;
                string? actorEmail = null;
                if (ctx?.User?.Identity?.IsAuthenticated == true)
                {
                    var idClaim = ctx.User.FindFirst("userId")?.Value;
                    if (int.TryParse(idClaim, out var id)) actorId = id;
                    actorEmail = ctx.User.FindFirstValue(ClaimTypes.Email);
                }

                var entry = new AuditLog
                {
                    Action = action,
                    Level = level,
                    ActorUserId = actorId,
                    ActorEmail = actorEmail,
                    EntityType = entityType,
                    EntityId = entityId,
                    Details = Truncate(details, 2000),
                    IpAddress = ctx?.Connection?.RemoteIpAddress?.ToString(),
                    Path = Truncate(ctx?.Request?.Path.Value, 255),
                    Timestamp = DateTime.UtcNow,
                };

                _db.AuditLogs.Add(entry);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Журнал ніколи не повинен валити основну операцію.
                _logger.LogWarning(ex, "Failed to write audit log for action {Action}", action);
            }
        }

        private static string? Truncate(string? s, int max) =>
            string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s.Substring(0, max));
    }
}
