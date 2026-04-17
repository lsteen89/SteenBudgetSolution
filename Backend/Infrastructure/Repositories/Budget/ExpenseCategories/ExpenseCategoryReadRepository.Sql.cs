namespace Backend.Infrastructure.Repositories.Budget.ExpenseCategories;

public sealed partial class ExpenseCategoryReadRepository
{
    private const string GetExpenseCategories = @"
    SELECT
        ec.Id,
        ec.Name
    FROM ExpenseCategory ec
    ORDER BY ec.Name ASC, ec.Id ASC;";
}
