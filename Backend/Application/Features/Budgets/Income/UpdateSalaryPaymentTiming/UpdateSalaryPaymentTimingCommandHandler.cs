using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Income;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Income.UpdateSalaryPaymentTiming;

public sealed class UpdateSalaryPaymentTimingCommandHandler
    : MediatR.IRequestHandler<UpdateSalaryPaymentTimingCommand, Result<SalaryPaymentTimingDto>>
{
    private readonly IUserRepository _users;
    private readonly IBudgetMonthRepository _budgetMonths;
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IIncomeRepository _incomeRepository;
    private readonly ITimeProvider _clock;

    public UpdateSalaryPaymentTimingCommandHandler(
        IUserRepository users,
        IBudgetMonthRepository budgetMonths,
        IBudgetMonthLifecycleService lifecycle,
        IIncomeRepository incomeRepository,
        ITimeProvider clock)
    {
        _users = users;
        _budgetMonths = budgetMonths;
        _lifecycle = lifecycle;
        _incomeRepository = incomeRepository;
        _clock = clock;
    }

    public async Task<Result<SalaryPaymentTimingDto>> Handle(
        UpdateSalaryPaymentTimingCommand command,
        CancellationToken ct)
    {
        var user = await _users.GetUserModelAsync(email: command.Email, ct: ct);
        if (user is null || user.PersoId == Guid.Empty)
        {
            return Result<SalaryPaymentTimingDto>.Failure(
                new Error("User.NotFound", "User not found."));
        }

        var validationError = Validate(command.Request);
        if (validationError is not null)
        {
            return Result<SalaryPaymentTimingDto>.Failure(validationError);
        }

        var budgetId = await _budgetMonths.GetBudgetIdByPersoidAsync(user.PersoId, ct);
        if (budgetId is null)
        {
            return Result<SalaryPaymentTimingDto>.Failure(
                new Error("Budget.NotFound", "No budget found for current user."));
        }

        var openMonthYearMonth = (await _budgetMonths.GetOpenMonthsAsync(budgetId.Value, ct))
            .FirstOrDefault()
            ?.YearMonth;

        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            user.PersoId,
            user.PersoId,
            openMonthYearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
        {
            return Result<SalaryPaymentTimingDto>.Failure(
                ensured.Error ?? BudgetMonth.NotFound);
        }

        var nowUtc = _clock.UtcNow;
        var monthRows = await _budgetMonths.UpdateBudgetMonthIncomePaymentTimingAsync(
            ensured.Value.BudgetMonthId,
            command.Request.IncomePaymentDayType!.Trim(),
            command.Request.IncomePaymentDay,
            user.PersoId,
            nowUtc,
            ct);

        if (monthRows < 1)
        {
            return Result<SalaryPaymentTimingDto>.Failure(
                IncomePaymentErrors.BudgetMonthIncomeNotFound);
        }

        if (command.Request.UpdateCurrentAndFuture)
        {
            var baselineRows = await _incomeRepository.UpdatePaymentTimingAsync(
                ensured.Value.BudgetId,
                command.Request.IncomePaymentDayType!.Trim(),
                command.Request.IncomePaymentDay,
                user.PersoId,
                nowUtc,
                ct);

            if (baselineRows < 1)
            {
                return Result<SalaryPaymentTimingDto>.Failure(
                    IncomePaymentErrors.BaselineIncomeNotFound);
            }
        }

        return Result<SalaryPaymentTimingDto>.Success(
            new SalaryPaymentTimingDto(
                command.Request.IncomePaymentDayType!.Trim(),
                command.Request.IncomePaymentDay,
                command.Request.UpdateCurrentAndFuture));
    }

    private static Error? Validate(UpdateSalaryPaymentTimingRequestDto request)
    {
        var paymentDayType = request.IncomePaymentDayType?.Trim();

        if (!string.Equals(paymentDayType, "dayOfMonth", StringComparison.Ordinal) &&
            !string.Equals(paymentDayType, "lastDayOfMonth", StringComparison.Ordinal))
        {
            return IncomePaymentErrors.InvalidType;
        }

        if (string.Equals(paymentDayType, "dayOfMonth", StringComparison.Ordinal))
        {
            if (request.IncomePaymentDay is null)
            {
                return new Error(
                    IncomePaymentErrors.InvalidDay.Code,
                    "IncomePaymentDay is required when IncomePaymentDayType is dayOfMonth.");
            }

            if (request.IncomePaymentDay < 1 || request.IncomePaymentDay > 28)
            {
                return new Error(
                    IncomePaymentErrors.InvalidDay.Code,
                    "IncomePaymentDay must be between 1 and 28 when IncomePaymentDayType is dayOfMonth.");
            }

            return null;
        }

        if (request.IncomePaymentDay is not null)
        {
            return new Error(
                IncomePaymentErrors.InvalidDay.Code,
                "IncomePaymentDay must be null when IncomePaymentDayType is lastDayOfMonth.");
        }

        return null;
    }
}
