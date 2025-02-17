using Backend.Application.Interfaces.JWT;
using Backend.Domain.Entities;

namespace Backend.Application.Helpers.Jwt
{
    public static class TokenHelper
    {
        public static JwtTokenModel CreateTokenModel(Guid persoid, string email, string deviceId, string userAgent)
        {
            return new JwtTokenModel
            {
                Persoid = persoid,
                Email = email,
                DeviceId = deviceId,
                UserAgent = userAgent
            };
        }
    }
}
