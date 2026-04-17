using Backend.Domain.Shared;
using MediatR;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;


public sealed record CreateBudgetMonthExpenseItemCommand(
    Guid Persoid,
    string YearMonth,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive)
    : IRequest<Result<BudgetMonthExpenseItemEditorRowDto?>>, ITransactionalCommand;