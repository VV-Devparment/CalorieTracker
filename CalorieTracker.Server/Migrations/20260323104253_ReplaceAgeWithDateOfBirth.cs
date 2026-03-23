using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CalorieTracker.Server.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceAgeWithDateOfBirth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Age",
                table: "Users");

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateOfBirth",
                table: "Users",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "Users");

            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "Users",
                type: "integer",
                nullable: true);
        }
    }
}
