using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CalorieTracker.Server.Services;

namespace CalorieTracker.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AchievementsController(AchievementService achievementService) : ControllerBase
    {
        private int CurrentUserId =>
            int.Parse(User.FindFirst("userId")?.Value ?? "0");

        // GET /api/achievements — all definitions with unlock status
        [HttpGet]
        public async Task<IActionResult> GetAchievements()
        {
            var achievements = await achievementService.GetUserAchievementsAsync(CurrentUserId);
            return Ok(achievements);
        }

        // POST /api/achievements/check — check and unlock new achievements, returns newly unlocked
        [HttpPost("check")]
        public async Task<IActionResult> CheckAchievements()
        {
            var newlyUnlocked = await achievementService.CheckAndUnlockAsync(CurrentUserId);
            return Ok(newlyUnlocked);
        }
    }
}
