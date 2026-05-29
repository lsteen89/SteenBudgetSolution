namespace Backend.Application.DTO.Budget.Months.Editor;

// `SubscriptionLifecycleStatus` is additive and nullable so existing callers
// keep working unchanged. Backend rule mirrors the patch endpoint:
//   - must be null for non-subscription rows
//   - if subscription and the caller does not supply a value, the handler
//     defaults to "active" to match the existing materialization behavior
public sealed record CreateBudgetMonthExpenseItemRequestDto(
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    string? SubscriptionLifecycleStatus = null);