namespace Backend.Models
{
    public class UserTokenModel
    {
        public Guid PersoId { get; set; }
        public Guid Token { get; set; }
        public DateTime TokenExpiryDate { get; set; }

    }
}
