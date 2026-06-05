namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 3: one row per real balance UPDATE on a debt (month side or plan
// side). Lives parallel to `BudgetMonthChangeEventWriteModel`, not nested
// inside it, because:
//
//   1. Balance is a liability snapshot, not a row-shape edit; recap / progress
//      reads need typed numeric columns (`OldBalance`, `NewBalance`, `Delta`)
//      that they can query without parsing JSON.
//   2. PR 4's `mark-paid-off` command will reuse this exact insert path when
//      it optionally drives balance to zero, so the same shape covers both
//      the editor's `Uppdatera saldo` flow and the lifecycle command.
//
// Linkage columns are nullable so a `budgetPlanOnly` write can describe a
// plan-side mutation that has no month row at all, and a `currentMonthOnly`
// write can omit `DebtId` for month-only rows (`SourceDebtId is null`).
//
// `Delta` is stored explicitly rather than computed by the DB so MariaDB
// portability stays trivial; the handler always writes
// `Delta = NewBalance - OldBalance`.
public sealed record DebtBalanceEventWriteModel(
    Guid Id,
    Guid BudgetId,
    Guid? DebtId,
    Guid? BudgetMonthDebtId,
    Guid? BudgetMonthId,
    decimal OldBalance,
    decimal NewBalance,
    decimal Delta,
    string Scope,
    string? Note,
    Guid ChangedByUserId,
    DateTime ChangedAt);
