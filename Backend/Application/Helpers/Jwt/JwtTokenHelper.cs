using Backend.Application.Interfaces.JWT;
using Backend.Domain.Entities;

namespace Backend.Application.Helpers.Jwt
{
    public static class TokenHelper
    {
        public static JwtTokenModel CreateTokenModel(Guid persoid, string email, bool firstLogin, string deviceId, string userAgent)
        {
            return new JwtTokenModel
            {
                Persoid = persoid,
                Email = email,
                FirstLogin = firstLogin,
                DeviceId = deviceId,
                UserAgent = userAgent
            };
        }
    }
}
