using Backend.Application.Features.Budgets.Months.Models.Baseline;
using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Features.Budgets.Months.NextPreview;

/// <summary>
/// The active budget-plan rows a next-month preview is projected from. This is
/// the same source the materialiser copies into a real month — read here only,
/// never written. Assembled by the handler from
/// <see cref="Backend.Application.Abstractions.Infrastructure.Data.IBudgetMonthSeedSourceRepository"/>.
/// </summary>
public sealed record BudgetPlanSeed(
    BaselineIncomeSeedRm? Income,
    IReadOnlyList<BaselineSideHustleSeedRm> SideHustles,
    IReadOnlyList<BaselineHouseholdMemberSeedRm> HouseholdMembers,
    IReadOnlyList<BaselineExpenseItemSeedRm> ExpenseItems,
    BaselineSavingsSeedRm? Savings,
    IReadOnlyList<BaselineSavingsGoalSeedRm> SavingsGoals,
    IReadOnlyList<BaselineDebtSeedRm> Debts,
    RepaymentStrategy RepaymentStrategy);
