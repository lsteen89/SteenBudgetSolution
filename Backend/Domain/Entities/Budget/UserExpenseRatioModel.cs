using Backend.Domain.Entities.User;

namespace Backend.Domain.Entities.Budget
{
    public class UserExpenseRatioModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }
        public Guid? PartnerId { get; set; }
        public decimal Ratio { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
        public UserModel? User { get; set; }
    }

}
