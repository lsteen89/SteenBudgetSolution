using Backend.Common.Utilities;             
using Backend.Domain.Abstractions;

namespace Backend.Infrastructure.Identity;

public sealed class HttpCurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _http;

    public HttpCurrentUserContext(IHttpContextAccessor http) => _http = http;

    public Guid Persoid => _http.HttpContext?.User.GetPersoid() ?? Guid.Empty;
    public string UserName => _http.HttpContext?.User.GetEmail() ?? "anonymous";
}
