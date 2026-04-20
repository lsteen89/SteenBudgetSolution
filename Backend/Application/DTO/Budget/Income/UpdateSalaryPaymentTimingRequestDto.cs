namespace Backend.Application.DTO.Budget.Income;

public sealed record UpdateSalaryPaymentTimingRequestDto(
    string? IncomePaymentDayType,
    int? IncomePaymentDay,
    bool UpdateCurrentAndFuture
);
