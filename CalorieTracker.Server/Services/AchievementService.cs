using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.Models;

namespace CalorieTracker.Server.Services
{
    public record AchievementDefinition(
        string Code,
        string Title,
        string Description,
        string Emoji,
        string Category
    );

    public record AchievementDto(
        string Code,
        string Title,
        string Description,
        string Emoji,
        string Category,
        bool IsUnlocked,
        DateTime? UnlockedAt
    );

    public class AchievementService(AppDbContext context)
    {
        private static readonly List<AchievementDefinition> Definitions =
        [
            // Meals
            new("FIRST_MEAL",       "Перший крок",        "Додайте перший прийом їжі",               "🍽️", "Харчування"),
            new("MEALS_10",         "Початківець",        "Зробіть 10 прийомів їжі",                 "🥗", "Харчування"),
            new("MEALS_50",         "Постійний",          "Зробіть 50 прийомів їжі",                 "💪", "Харчування"),
            new("MEALS_100",        "Профі",              "Зробіть 100 прийомів їжі",                "🏆", "Харчування"),

            // Active days
            new("DAYS_7",           "Тиждень",            "7 днів з записами харчування",             "📅", "Активність"),
            new("DAYS_30",          "Місяць",             "30 днів з записами харчування",            "🗓️", "Активність"),

            // Streak
            new("STREAK_3",         "3 дні поспіль",      "Відстежуйте харчування 3 дні підряд",     "🔥", "Серія"),
            new("STREAK_7",         "Тижнева серія",      "Відстежуйте харчування 7 днів підряд",    "⚡", "Серія"),
            new("STREAK_14",        "Двотижнева серія",   "Відстежуйте харчування 14 днів підряд",   "🌟", "Серія"),

            // Calorie goal
            new("CALORIE_GOAL",     "Ціль досягнута",     "Вперше досягніть денної цілі калорій",    "🎯", "Цілі"),
            new("CALORIE_GOAL_5",   "Стабільність",       "Досягніть цілі калорій 5 разів",          "✅", "Цілі"),
            new("CALORIE_GOAL_20",  "Дисципліна",         "Досягніть цілі калорій 20 разів",         "🎖️", "Цілі"),

            // Weight
            new("WEIGHT_FIRST",     "Перший вимір",       "Додайте перший запис ваги",               "⚖️", "Вага"),
            new("WEIGHT_10",        "Тримаємо курс",      "Зробіть 10 записів ваги",                 "📊", "Вага"),

            // Food
            new("CUSTOM_FOOD",      "Власний продукт",    "Додайте перший власний продукт",          "🧑‍🍳", "Продукти"),
        ];

        public static List<AchievementDefinition> AllDefinitions => Definitions;

        public async Task<List<AchievementDto>> GetUserAchievementsAsync(int userId)
        {
            var unlocked = await context.Achievements
                .Where(a => a.UserId == userId)
                .ToListAsync();

            return Definitions.Select(def =>
            {
                var unlock = unlocked.FirstOrDefault(u => u.Code == def.Code);
                return new AchievementDto(
                    def.Code, def.Title, def.Description, def.Emoji, def.Category,
                    unlock != null, unlock?.UnlockedAt
                );
            }).ToList();
        }

        public async Task<List<AchievementDto>> CheckAndUnlockAsync(int userId)
        {
            var alreadyUnlocked = await context.Achievements
                .Where(a => a.UserId == userId)
                .Select(a => a.Code)
                .ToHashSetAsync();

            var user = await context.Users.FindAsync(userId);

            // Gather stats
            var meals = await context.Meals
                .Where(m => m.UserId == userId)
                .Include(m => m.Items)
                .ToListAsync();

            var totalMeals = meals.Count;
            var activeDays = meals.Select(m => m.Date).Distinct().OrderBy(d => d).ToList();
            var daysWithData = activeDays.Count;
            var streak = ComputeCurrentStreak(activeDays);

            var weightCount = await context.WeightRecords
                .CountAsync(w => w.UserId == userId);

            var customFoodCount = await context.Foods
                .CountAsync(f => f.CreatedBy == userId && f.IsCustom);

            // Compute calorie goal the same way as UsersController
            int calorieGoalDays = 0;
            var calorieGoal = ComputeCalorieGoal(user, await context.WeightRecords
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.RecordDate)
                .FirstOrDefaultAsync());

            if (calorieGoal > 0)
            {
                var dailyCalories = meals
                    .GroupBy(m => m.Date)
                    .ToDictionary(
                        g => g.Key,
                        g => g.SelectMany(m => m.Items).Sum(i => i.Quantity * i.CaloriesPer100g / 100)
                    );
                calorieGoalDays = dailyCalories.Count(kv => kv.Value >= calorieGoal * 0.9m);
            }

            // Determine which achievements to unlock
            var toUnlock = new List<string>();

            Check("FIRST_MEAL",     totalMeals >= 1);
            Check("MEALS_10",       totalMeals >= 10);
            Check("MEALS_50",       totalMeals >= 50);
            Check("MEALS_100",      totalMeals >= 100);
            Check("DAYS_7",         daysWithData >= 7);
            Check("DAYS_30",        daysWithData >= 30);
            Check("STREAK_3",       streak >= 3);
            Check("STREAK_7",       streak >= 7);
            Check("STREAK_14",      streak >= 14);
            Check("CALORIE_GOAL",   calorieGoalDays >= 1);
            Check("CALORIE_GOAL_5", calorieGoalDays >= 5);
            Check("CALORIE_GOAL_20",calorieGoalDays >= 20);
            Check("WEIGHT_FIRST",   weightCount >= 1);
            Check("WEIGHT_10",      weightCount >= 10);
            Check("CUSTOM_FOOD",    customFoodCount >= 1);

            void Check(string code, bool condition)
            {
                if (condition && !alreadyUnlocked.Contains(code))
                    toUnlock.Add(code);
            }

            if (toUnlock.Count > 0)
            {
                var now = DateTime.UtcNow;
                var newAchievements = toUnlock.Select(code => new Achievement
                {
                    UserId = userId,
                    Code = code,
                    UnlockedAt = now
                });
                context.Achievements.AddRange(newAchievements);
                await context.SaveChangesAsync();
            }

            // Return only newly unlocked as full DTOs
            return toUnlock
                .Select(code =>
                {
                    var def = Definitions.First(d => d.Code == code);
                    return new AchievementDto(def.Code, def.Title, def.Description, def.Emoji, def.Category,
                        true, DateTime.UtcNow);
                })
                .ToList();
        }

        private static int ComputeCalorieGoal(User? user, WeightRecord? latest)
        {
            if (user == null || latest == null) return 0;
            if (!latest.Height.HasValue || string.IsNullOrEmpty(user.Gender)) return 0;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (!user.DateOfBirth.HasValue) return 0;
            int age = today.Year - user.DateOfBirth.Value.Year;
            if (user.DateOfBirth.Value > today.AddYears(-age)) age--;

            decimal weight = latest.Weight;
            decimal height = latest.Height.Value;

            decimal bmr = user.Gender.ToLower() == "male"
                ? (10 * weight) + (6.25m * height) - (5 * age) + 5
                : (10 * weight) + (6.25m * height) - (5 * age) - 161;

            decimal multiplier = user.ActivityLevel switch
            {
                1 => 1.2m, 2 => 1.375m, 3 => 1.55m, 4 => 1.725m, 5 => 1.9m, _ => 1.2m
            };

            return (int)Math.Round(bmr * multiplier);
        }

        private static int ComputeCurrentStreak(List<DateOnly> sortedDays)
        {
            if (sortedDays.Count == 0) return 0;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var streak = 0;
            var current = today;

            // Allow streak to start from today or yesterday
            if (sortedDays[^1] < today.AddDays(-1))
                return 0;

            for (int i = sortedDays.Count - 1; i >= 0; i--)
            {
                if (sortedDays[i] == current || sortedDays[i] == current.AddDays(-1) && streak == 0)
                {
                    current = sortedDays[i];
                    streak++;
                    if (i > 0 && sortedDays[i - 1] == current.AddDays(-1))
                        continue;
                    else if (i > 0 && sortedDays[i - 1] < current.AddDays(-1))
                        break;
                }
                else if (sortedDays[i] == current.AddDays(-1))
                {
                    current = sortedDays[i];
                    streak++;
                }
                else
                {
                    break;
                }
            }

            return streak;
        }
    }
}
