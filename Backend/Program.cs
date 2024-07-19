using Backend.DataAccess;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
GlobalConfig.Initialize(configuration);

// Debugging: Print all environment variables
var allVariables = Environment.GetEnvironmentVariables();
foreach (var key in allVariables.Keys)
{
    Console.WriteLine($"{key}={allVariables[key]}");
}

// Load the JWT secret key from environment variables
var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT secret key not configured in environment variables.");
}

var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// Add services to the container.
builder.Services.AddScoped<SqlExecutor>(); // Inject SqlExecutor
builder.Services.AddScoped<UserServices>(); // Inject UserServices

// Configure EmailService based on environment
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IEmailService, MockEmailService>();
}
else
{
    builder.Services.AddSingleton<IEmailService, EmailService>();

}

// Adding CORS policies
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCorsPolicy",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000") // Local frontend URL
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });

    options.AddPolicy("ProductionCorsPolicy",
        builder =>
        {
            builder.WithOrigins("https://www.ebudget.se") // Production frontend URL
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevelopmentCorsPolicy"); // Apply the CORS policy for development
}
else
{
    app.UseHttpsRedirection();
    app.UseCors("ProductionCorsPolicy"); // Apply the CORS policy for production
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
