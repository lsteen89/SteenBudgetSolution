using Backend.Domain.Entities.User;

namespace Backend.Domain.Entities.Budget
{
    public class IncomeModel
    {
        public int Id { get; set; }
        public Guid PersoId { get; set; }
        public decimal MainIncome { get; set; }
        public decimal SideIncome { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedTime { get; set; }
        public DateTime? LastUpdatedTime { get; set; }
        public UserModel User { get; set; }
    }
}
