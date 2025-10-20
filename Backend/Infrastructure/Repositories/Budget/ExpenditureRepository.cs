using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Expenses;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget;

public class ExpenditureRepository : SqlBase, IExpenditureRepository
{
    private readonly ICurrentUserContext _currentUser;

    public ExpenditureRepository(IUnitOfWork unitOfWork, ILogger<ExpenditureRepository> logger, ICurrentUserContext currentUser, IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
        _currentUser = currentUser;
    }

    public async Task AddAsync(Expense expense, Guid budgetId, CancellationToken ct)
    {
        const string sql = @"
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedByUserId)
            VALUES (@Id, @BudgetId, @CategoryId, @Name, @AmountMonthly, @CreatedByUserId);";

        var itemsToInsert = expense.Items.ToList();
        if (!itemsToInsert.Any())
        {
            return; // Nothing to do
        }

        var createdByUserId = _currentUser.Persoid;
        if (createdByUserId == Guid.Empty)
            throw new InvalidOperationException("Current user context is not set.");

        // Prepare all items for insertion
        foreach (var item in itemsToInsert)
        {
            item.Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id;
            item.BudgetId = budgetId;
            item.CreatedByUserId = createdByUserId;
        }

        // Dapper will iterate over the collection and execute the insert for each item
        await ExecuteAsync(sql, itemsToInsert, ct);

        _logger.LogInformation(
            "Inserted {Count} expense items for budget {BudgetId}",
            itemsToInsert.Count,
            budgetId);
    }

    // ... other IExpenditureRepository methods ...
}