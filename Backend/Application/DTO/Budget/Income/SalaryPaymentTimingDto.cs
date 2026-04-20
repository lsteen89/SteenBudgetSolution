namespace Backend.Application.DTO.Budget.Income;

public sealed record SalaryPaymentTimingDto(
    string IncomePaymentDayType,
    int? IncomePaymentDay,
    bool UpdateCurrentAndFuture
);
