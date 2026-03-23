using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Models;

namespace CalorieTracker.Server.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // DbSets
        public DbSet<User> Users { get; set; }
        public DbSet<Food> Foods { get; set; }
        public DbSet<Meal> Meals { get; set; }
        public DbSet<MealItem> MealItems { get; set; }
        public DbSet<UserGoal> UserGoals { get; set; }
        public DbSet<WeightRecord> WeightRecords { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
                entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Gender).HasMaxLength(10);
                // Height removed from Users — moved to WeightRecords (3NF)
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");

            });

            // Food configuration
            modelBuilder.Entity<Food>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Brand).HasMaxLength(100);
                entity.Property(e => e.Category).HasMaxLength(50);
                entity.Property(e => e.Barcode).HasMaxLength(50);
                entity.Property(e => e.ExternalId).HasMaxLength(100);
                entity.Property(e => e.Source).HasMaxLength(20);
                entity.HasIndex(e => new { e.ExternalId, e.Source })
                      .HasFilter("\"ExternalId\" IS NOT NULL")
                      .HasDatabaseName("IX_Foods_ExternalId_Source");
                entity.Property(e => e.CaloriesPer100g).HasColumnType("decimal(6,2)").IsRequired();
                entity.Property(e => e.ProteinPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.FatsPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.CarbsPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.FiberPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.SugarPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.SodiumPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

                // Relationship with User (Creator)
                entity.HasOne(e => e.Creator)
                      .WithMany(u => u.CustomFoods)
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // Meal configuration
            modelBuilder.Entity<Meal>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Date).IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

                // Relationship with User
                entity.HasOne(e => e.User)
                      .WithMany(u => u.Meals)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Index for performance
                entity.HasIndex(e => new { e.UserId, e.Date });
            });

            // MealItem configuration
            modelBuilder.Entity<MealItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FoodName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.FoodBrand).HasMaxLength(100);
                entity.Property(e => e.CaloriesPer100g).HasColumnType("decimal(6,2)").HasDefaultValue(0);
                entity.Property(e => e.ProteinPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.FatsPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.CarbsPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.FiberPer100g).HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.ExternalId).HasMaxLength(100);
                entity.Property(e => e.Source).HasMaxLength(20);
                entity.Property(e => e.Quantity).HasColumnType("decimal(6,2)").IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

                // Relationship with Meal only — no FK to Foods
                entity.HasOne(e => e.Meal)
                      .WithMany(m => m.Items)
                      .HasForeignKey(e => e.MealId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // UserGoal configuration
            modelBuilder.Entity<UserGoal>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.GoalType).HasMaxLength(50).IsRequired();
                entity.Property(e => e.TargetWeight).HasColumnType("decimal(5,2)");
                entity.Property(e => e.DailyProteinTarget).HasColumnType("decimal(5,2)");
                entity.Property(e => e.DailyFatsTarget).HasColumnType("decimal(5,2)");
                entity.Property(e => e.DailyCarbsTarget).HasColumnType("decimal(5,2)");
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

                // Relationship with User
                entity.HasOne(e => e.User)
                      .WithMany(u => u.UserGoals)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // WeightRecord configuration
            modelBuilder.Entity<WeightRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Weight).HasColumnType("decimal(5,2)").IsRequired();
                entity.Property(e => e.Height).HasColumnType("decimal(5,2)");
                entity.Property(e => e.RecordDate).IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

                // Relationship with User
                entity.HasOne(e => e.User)
                      .WithMany(u => u.WeightRecords)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Index for performance
                entity.HasIndex(e => new { e.UserId, e.RecordDate });
            });

        }
    }
}