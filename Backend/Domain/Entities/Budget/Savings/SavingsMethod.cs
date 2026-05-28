namespace Backend.Domain.Entities.Budget.Savings
{
    // Plan-level savings method (a storage vehicle: savings account, ISK, etc.).
    // `Code` is a stable system code from `SavingsMethodCodes`. `CustomLabel`
    // is only populated when `Code == "custom"`; for system codes it must be
    // null. Enforced at the DB layer via CK_SavingsMethod_CustomLabel.
    public class SavingsMethod
    {
        public Guid Id { get; set; }
        public Guid SavingsId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? CustomLabel { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public Guid CreatedByUserId { get; set; }
        public Guid? UpdatedByUserId { get; set; }
    }
}
