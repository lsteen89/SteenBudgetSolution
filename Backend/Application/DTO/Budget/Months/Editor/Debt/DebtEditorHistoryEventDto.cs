namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 5: typed projection of recent `BudgetMonthChangeEvent` rows for
// debts in this month. PR 8 uses the list to render a small "senaste
// händelser" timeline next to the lifecycle confirmation dialogs.
//
//   `Id` / `ChangedAt`  — stable order key (DESC).
//   `EntityId`          — the affected `BudgetMonthDebt.Id`.
//   `SourceEntityId`    — the linked `Debt.Id`, null for month-only rows.
//   `EntityType`        — always "debt" for this projection; surfaced for
//                          forward-compat so the FE can render shared event
//                          components if savings/expense recap reuse this
//                          shape later.
//   `ChangeType`        — created | updated | deleted (from the existing
//                          `BudgetMonthChangeEvent.ChangeType` column).
//   `Action`            — parsed from `ChangeSetJson.action`, when present.
//                          PR 4's lifecycle / participation handlers always
//                          write one of `DebtLifecycleAuditActions` here
//                          (e.g. `markPaidOff`, `archive`, `setParticipation`);
//                          older planned-payment edits leave it null and the
//                          FE renders the row using only `ChangeType`.
//
// The endpoint caps this list at 10 — enough for a recent-activity hint, not
// enough to be a full audit log. A future recap page will own deeper history.
public sealed record DebtEditorHistoryEventDto(
    Guid Id,
    Guid EntityId,
    Guid? SourceEntityId,
    string EntityType,
    string ChangeType,
    string? Action,
    DateTime ChangedAt);
