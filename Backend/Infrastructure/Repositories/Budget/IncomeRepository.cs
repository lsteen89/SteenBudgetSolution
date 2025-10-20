using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Income;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget;

public class IncomeRepository : SqlBase, IIncomeRepository
{
    private readonly ICurrentUserContext _currentUser;

    public IncomeRepository(IUnitOfWork unitOfWork, ILogger<IncomeRepository> logger, ICurrentUserContext currentUser, IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
        _currentUser = currentUser;
    }

    public async Task AddAsync(Income income, Guid budgetId, CancellationToken ct)
    {
        // SQL queries are now private constants within the repository
        const string insertIncomeSql = @"
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, CreatedByUserId)
            VALUES (@Id, @BudgetId, @NetSalaryMonthly, @SalaryFrequency, @CreatedByUserId);";

        const string insertSideSql = @"
            INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
            VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @CreatedByUserId);";

        const string insertMemberSql = @"
            INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
            VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @CreatedByUserId);";

        var createdByUserId = _currentUser.Persoid;
        if (createdByUserId == Guid.Empty)
            throw new InvalidOperationException("Current user context is not set.");

        // 1. Prepare and Insert the parent record
        income.Id = income.Id == Guid.Empty ? Guid.NewGuid() : income.Id;
        income.BudgetId = budgetId;
        income.CreatedByUserId = createdByUserId;

        await ExecuteAsync(insertIncomeSql, income, ct);

        // 2. Handle Side Hustles
        if (income.SideHustles?.Count > 0)
        {
            foreach (var sh in income.SideHustles)
            {
                sh.Id = Guid.NewGuid();
                sh.IncomeId = income.Id;
                sh.CreatedByUserId = createdByUserId;
            }
            await ExecuteAsync(insertSideSql, income.SideHustles, ct);
        }

        // 3. Handle Household Members
        if (income.HouseholdMembers?.Count > 0)
        {
            foreach (var hm in income.HouseholdMembers)
            {
                hm.Id = Guid.NewGuid();
                hm.IncomeId = income.Id;
                hm.CreatedByUserId = createdByUserId;
            }
            await ExecuteAsync(insertMemberSql, income.HouseholdMembers, ct);
        }
    }
}