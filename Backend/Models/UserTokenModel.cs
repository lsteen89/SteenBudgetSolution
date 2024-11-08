namespace Backend.Models
{
    public class UserTokenModel
    {
        public Guid PersoId { get; set; }
        public string Token { get; set; }
        public DateTime TokenExpiryDate { get; set; }

    }
}
