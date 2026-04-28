using Microsoft.EntityFrameworkCore;
using CalorieTracker.Server.Data;
using CalorieTracker.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // ������������ ��� ����������� ��������� ���������� �������
        options.JsonSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Configure Entity Framework
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
// Strip parameters unsupported by Npgsql 9 (e.g. "Trust Server Certificate" from SQL Server connection strings)
var cleanedConnectionString = string.Join(";", rawConnectionString
    .Split(';')
    .Where(part => !part.Trim().StartsWith("Trust Server Certificate", StringComparison.OrdinalIgnoreCase)));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(cleanedConnectionString));

// Configure CORS for React app
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?.Split(',')
            ?? new[] { "https://localhost:5173", "http://localhost:5173", "http://localhost:5208" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

if (string.IsNullOrEmpty(secretKey))
{
    throw new InvalidOperationException("JWT SecretKey is not configured");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

// Register services
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor(); // потрібен AuditService для extraction юзера/IP
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuditService, AuditService>();

// HTTP clients for FatSecret Platform API (OAuth 2.0) — Premier Free (US data set).
builder.Services.AddHttpClient("FatSecretAuth", c =>
{
    c.BaseAddress = new Uri("https://oauth.fatsecret.com/");
    c.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient("FatSecretApi", c =>
{
    c.BaseAddress = new Uri("https://platform.fatsecret.com/");
    c.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddScoped<ExternalFoodService>();
builder.Services.AddScoped<AchievementService>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "CalorieTracker API", Version = "v1" });
});

var app = builder.Build();

// Apply database migrations automatically on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CalorieTracker API V1");
        c.RoutePrefix = "swagger";
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Use CORS
app.UseCors("AllowReactApp");

// Use Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Логування необроблених винятків у AuditLog (після авторизації, щоб мати юзера в контексті)
app.UseMiddleware<CalorieTracker.Server.Middleware.ErrorLoggingMiddleware>();

app.MapControllers();

// Serve React app (for production)
app.UseDefaultFiles();
app.UseStaticFiles();

// Fallback to React app
app.MapFallbackToFile("/index.html");

app.Run();