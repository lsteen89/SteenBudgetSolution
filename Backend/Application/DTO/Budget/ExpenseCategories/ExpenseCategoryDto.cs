namespace Backend.Application.DTO.Budget.ExpenseCategories;

public sealed record ExpenseCategoryDto(
    Guid Id,
    string Name,
    string Code);
