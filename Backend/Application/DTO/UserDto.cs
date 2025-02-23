namespace Backend.Application.DTO
{
    public class UserDto
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
    }
}
