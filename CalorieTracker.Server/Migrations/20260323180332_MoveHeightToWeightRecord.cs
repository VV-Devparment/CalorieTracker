using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CalorieTracker.Server.Migrations
{
    /// <inheritdoc />
    public partial class MoveHeightToWeightRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "Users");

            migrationBuilder.AddColumn<decimal>(
                name: "Height",
                table: "WeightRecords",
                type: "numeric(5,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "WeightRecords");

            migrationBuilder.AddColumn<decimal>(
                name: "Height",
                table: "Users",
                type: "numeric(5,2)",
                nullable: true);
        }
    }
}
