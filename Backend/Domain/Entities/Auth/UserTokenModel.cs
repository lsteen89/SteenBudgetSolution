namespace Backend.Domain.Entities.Auth
{
    public class UserTokenModel
    {
        public Guid PersoId { get; set; }
        public Guid Token { get; set; }
        public DateTime TokenExpiryDate { get; set; }

    }
}
