using CalorieTracker.Server.Services;

namespace CalorieTracker.Server.Middleware
{
    /// <summary>
    /// Ловить необроблені винятки в pipeline і пише запис у AuditLog (level=Error).
    /// Сам відповідь не формує — кидає виняток далі, щоб дефолтний обробник
    /// ASP.NET повернув 500. Це навмисне: ми не хочемо ховати помилки за middleware.
    /// </summary>
    public class ErrorLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ErrorLoggingMiddleware> _logger;

        public ErrorLoggingMiddleware(RequestDelegate next, ILogger<ErrorLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IAuditService audit)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception in {Path}", context.Request.Path);
                // best-effort — якщо аудит впаде, ковтаємо в AuditService
                await audit.LogAsync(
                    action: "API_ERROR",
                    entityType: null,
                    entityId: null,
                    details: $"{ex.GetType().Name}: {ex.Message}",
                    level: "Error");
                throw;
            }
        }
    }
}
