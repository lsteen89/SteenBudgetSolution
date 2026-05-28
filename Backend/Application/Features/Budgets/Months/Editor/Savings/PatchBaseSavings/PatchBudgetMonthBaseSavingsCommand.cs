using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchBaseSavings;

// Updates the per-month base savings ("Bassparande") scalar. Honours the
// standard three-scope contract via `BudgetMonthBaseSavingsEditScopes`:
// `currentMonthOnly` (default), `currentMonthAndBudgetPlan`, or
// `budgetPlanOnly`. Plan-writing scopes require a non-null `SourceSavingsId`
// on the month row — orphan months reject those with `BaseSavings.PlanMissing`.
public sealed record PatchBudgetMonthBaseSavingsCommand(
    Guid Persoid,
    string YearMonth,
    decimal AmountMonthly,
    string? Scope = null)
    : IRequest<Result<BudgetMonthBaseSavingsEditorDto?>>, ITransactionalCommand;
