using Backend.DataAccess;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
GlobalConfig.Initialize(configuration);

// Add services to the container.
var key = builder.Configuration["JwtSecretKey"];
// Use a secure way to store and retrieve this key
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

builder.Services.AddScoped<SqlExecutor>(); // Inject SqlExecutor
builder.Services.AddScoped<UserServices>(); // Inject UserServices

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
            builder.WithOrigins("http://ebudget.se") // Production frontend URL
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
