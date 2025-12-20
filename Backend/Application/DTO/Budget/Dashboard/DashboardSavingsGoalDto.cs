namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class DashboardSavingsGoalDto
{
    public Guid Id { get; init; }
    public string? Name { get; init; }
    public decimal? TargetAmount { get; init; }
    public DateTime? TargetDate { get; init; }
    public decimal? AmountSaved { get; init; }
}