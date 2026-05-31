using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtDetails;

// MediatR command for
// `PATCH /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/details`
// (Debt PR 2).
//
// Distinct from the narrow planned-payment patch in `PatchDebt` — this command
// updates the full metadata surface (Name, Type, Apr, MonthlyFee, MinPayment,
// TermMonths, MonthlyPayment) but never touches Balance. Balance moves through
// PR 3's dedicated `Uppdatera saldo` command.
//
// Scope: any of the three `BudgetMonthDebtEditScopes` values. Plan-writing
// scopes require a non-null `SourceDebtId` on the month row (rejected by
// `DebtMutationGuard.EnsureMutable`'s "month-only" branch).
//
// `ITransactionalCommand` so the optional baseline + month updates and the
// audit insert commit or roll back together.
public sealed record PatchBudgetMonthDebtDetailsCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    string Name,
    string Type,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string? Scope = null)
    : IRequest<Result<BudgetMonthDebtEditorRowDto?>>, ITransactionalCommand;
