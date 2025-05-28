namespace Backend.Infrastructure.Entities.Tokens
{
    public class RefreshJwtTokenArchiveEntity
    {
        public Guid Persoid { get; set; } // user
        public Guid SessionId { get; set; }
        public string AccessTokenJti { get; set; } // JTI of the access token that this refresh token is associated with
        public DateTime DeletedUtc { get; set; } // when the token was deleted
    }
}
