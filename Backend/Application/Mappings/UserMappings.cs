using Mapster;
using Backend.Domain.Entities.User;
using Backend.Application.DTO.User;

namespace Backend.Application.Mappings;

public static class UserMappings
{
    public static void Register(TypeAdapterConfig cfg)
    {
        cfg.NewConfig<UserModel, UserDto>()
           .Map(d => d.Persoid, s => s.PersoId) // domain PersoId → dto Persoid
           .Map(d => d.FirstName, s => s.FirstName)
           .Map(d => d.LastName, s => s.LastName)
           .Map(d => d.Email, s => s.Email)
           .Map(d => d.FirstLogin, s => s.FirstLogin)
           .Map(d => d.LastLogin, s => s.LastLoginUtc)
           .Map(d => d.Roles, s =>
               string.IsNullOrWhiteSpace(s.Roles)
                   ? Array.Empty<string>()
                   : s.Roles.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
           .IgnoreNonMapped(true);
    }
}
