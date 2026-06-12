using Backend.Application.DTO.Budget.Dashboard;

namespace Backend.Application.DTO.Budget.Months;

/// <summary>
/// Read-only projection of what the next month would look like if the budget
/// plan is applied unchanged. This is NOT a persisted budget month: producing
/// it never inserts a <c>BudgetMonth</c> row nor materialises month tables.
/// </summary>
/// <remarks>
/// <para><b>State</b>: <c>"preview"</c> when a projection is available from the
/// active open month; <c>"unavailable"</c> when there is no eligible open month
/// to preview from (in which case <see cref="Dashboard"/> is <c>null</c>).</para>
/// <para><b>Basis</b>: always <c>"budgetPlan"</c> — the recurring plan future
/// months start from.</para>
/// <para>All money lives in <see cref="Dashboard"/>, produced by the same
/// backend projector the live dashboard uses. The frontend must not compute
/// next-month totals itself.</para>
/// </remarks>
public sealed record NextMonthPreviewDto(
    string FromYearMonth,
    string PreviewYearMonth,
    string State,
    string Basis,
    string CurrencyCode,
    NextMonthPreviewCarryOverDto CarryOver,
    BudgetDashboardDto? Dashboard,
    IReadOnlyList<string> Limitations);

/// <summary>
/// Carry-over assumption baked into the preview.
/// </summary>
/// <remarks>
/// Before the current month closes, carry-over is an estimate only.
/// <list type="bullet">
/// <item><c>Mode = "none"</c>: no carry-over assumed (<c>Source = "none"</c>).</item>
/// <item><c>Mode = "estimatedFull"</c>: the current open month's live final
/// balance, floored at zero (<c>Source = "currentMonthLiveFinalBalance"</c>).
/// A negative current balance never becomes a negative carry-over.</item>
/// </list>
/// <see cref="IsFinal"/> is always <c>false</c> for a preview — the real
/// carry-over is fixed only by the close snapshot.
/// </remarks>
public sealed record NextMonthPreviewCarryOverDto(
    string Mode,
    decimal Amount,
    string Source,
    bool IsFinal);
