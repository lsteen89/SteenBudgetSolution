using FluentValidation;
using Backend.Presentation.Shared;
using System.Net;
using System.Text.Json;

namespace Backend.Presentation.Middleware;

public sealed class ValidationExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ValidationExceptionMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (ValidationException ex)
        {
            var msg = string.Join(" ", ex.Errors.Select(e => e.ErrorMessage));
            var env = ApiEnvelope<string>.Failure("Validation.Error", msg);

            ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(env));
        }
    }
}
