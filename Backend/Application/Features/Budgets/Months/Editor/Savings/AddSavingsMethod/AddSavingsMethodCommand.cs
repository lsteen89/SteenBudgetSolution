using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.AddSavingsMethod;

// Adds a plan-level savings method to the user's budget. Methods live on
// `Savings` (one row per budget), not on individual goals — the `YearMonth`
// only gates access via the lifecycle service. `CustomLabel` is required when
// `Code` is "custom" and must be null for any other code; the validator and
// the DB CHECK constraint both enforce the pairing.
public sealed record AddSavingsMethodCommand(
    Guid Persoid,
    string YearMonth,
    string Code,
    string? CustomLabel)
    : IRequest<Result<SavingsMethodDto?>>, ITransactionalCommand;
