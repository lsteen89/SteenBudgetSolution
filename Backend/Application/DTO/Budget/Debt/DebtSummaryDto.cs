using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.DTO.Budget.Debt;

public sealed class DebtSummaryDto
{
    public RepaymentStrategy RepaymentStrategy { get; set; } = RepaymentStrategy.Unknown;
}