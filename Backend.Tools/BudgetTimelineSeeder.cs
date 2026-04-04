using System.Data.Common;
using System.Globalization;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using MediatR;

public sealed class BudgetTimelineSeeder
{
    private static readonly Guid HousingCategoryId = Guid.Parse("2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21");
    private static readonly Guid FoodCategoryId = Guid.Parse("5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10");
    private static readonly Guid TransportCategoryId = Guid.Parse("5eb2896c-59f9-4a18-8c84-4c2a1659de80");
    private static readonly Guid FixedExpenseCategoryId = Guid.Parse("8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900");
    private static readonly Guid SubscriptionCategoryId = Guid.Parse("9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4");

    private readonly IUnitOfWork _uow;
    private readonly IMediator _mediator;
    private readonly IBudgetMonthLifecycleService _monthLifecycle;

    public BudgetTimelineSeeder(
        IUnitOfWork uow,
        IMediator mediator,
        IBudgetMonthLifecycleService monthLifecycle)
    {
        _uow = uow;
        _mediator = mediator;
        _monthLifecycle = monthLifecycle;
    }

    public async Task SeedThreeMonthTimelineAsync(Guid persoid, CancellationToken ct)
    {
        Guid budgetId = Guid.Empty;

        await RunInTransactionAsync(
            async () =>
            {
                budgetId = await EnsureBaselineBudgetAsync(persoid, ct);
                await EnsureNoExistingMonthsAsync(budgetId, ct);
            },
            ct);

        var now = DateTime.UtcNow;
        var anchor = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var oldestYm = anchor.AddMonths(-2).ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var middleYm = anchor.AddMonths(-1).ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var openYm = anchor.ToString("yyyy-MM", CultureInfo.InvariantCulture);

        await StartMonthAsync(
            persoid,
            oldestYm,
            closePreviousOpenMonth: false,
            carryOverMode: BudgetMonthCarryOverModes.None,
            ct);

        await RunInTransactionAsync(
            async () =>
            {
                await EnsureMaterializedMonthAsync(persoid, oldestYm, ct);
            },
            ct);

        await StartMonthAsync(
            persoid,
            middleYm,
            closePreviousOpenMonth: true,
            carryOverMode: BudgetMonthCarryOverModes.Full,
            ct);

        await RunInTransactionAsync(
            async () =>
            {
                var middle = await EnsureMaterializedMonthAsync(persoid, middleYm, ct);
                await OverrideExpenseAmountAsync(middle.BudgetMonthId, persoid, "Groceries", 3500m, ct);
                await OverrideExpenseAmountAsync(middle.BudgetMonthId, persoid, "Electricity", 820m, ct);
            },
            ct);

        await StartMonthAsync(
            persoid,
            openYm,
            closePreviousOpenMonth: true,
            carryOverMode: BudgetMonthCarryOverModes.Full,
            ct);

        await RunInTransactionAsync(
            async () =>
            {
                var open = await EnsureMaterializedMonthAsync(persoid, openYm, ct);
                await OverrideExpenseAmountAsync(open.BudgetMonthId, persoid, "Groceries", 3850m, ct);
                await OverrideExpenseAmountAsync(open.BudgetMonthId, persoid, "Electricity", 980m, ct);
                await OverrideExpenseAmountAsync(open.BudgetMonthId, persoid, "Transport Pass", 950m, ct);
            },
            ct);
    }

    private async Task RunInTransactionAsync(Func<Task> action, CancellationToken ct)
    {
        var startedTransaction = false;

        try
        {
            if (!_uow.IsInTransaction)
            {
                await _uow.BeginTransactionAsync(ct);
                startedTransaction = true;
            }

            await action();

            if (startedTransaction)
                await _uow.CommitAsync(ct);
        }
        catch
        {
            if (startedTransaction && _uow.IsInTransaction)
                await _uow.RollbackAsync(ct);

            throw;
        }
    }

    private async Task<Guid> EnsureBaselineBudgetAsync(Guid persoid, CancellationToken ct)
    {
        var existingBudgetId = await QueryGuidAsync(
            "SELECT Id FROM Budget WHERE Persoid = @Persoid LIMIT 1;",
            new Dictionary<string, object?> { ["Persoid"] = persoid },
            ct);

        var budgetId = existingBudgetId ?? Guid.NewGuid();

        if (!existingBudgetId.HasValue)
        {
            await ExecuteAsync(
                @"INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedByUserId)
                  VALUES (@BudgetId, @Persoid, 'snowball', @Persoid);",
                new Dictionary<string, object?>
                {
                    ["BudgetId"] = budgetId,
                    ["Persoid"] = persoid
                },
                ct);
        }

        await EnsureExpenseCategoriesAsync(ct);
        await EnsureBaselineIncomeAsync(budgetId, persoid, ct);
        await EnsureBaselineExpensesAsync(budgetId, persoid, ct);
        await EnsureBaselineSavingsAsync(budgetId, persoid, ct);
        await EnsureBaselineDebtsAsync(budgetId, persoid, ct);

        return budgetId;
    }

    private async Task EnsureExpenseCategoriesAsync(CancellationToken ct)
    {
        await ExecuteAsync(
            @"INSERT IGNORE INTO ExpenseCategory (Id, Name) VALUES
                (@Housing, 'Rent'),
                (@Food, 'Food'),
                (@Transport, 'Transport'),
                (@Fixed, 'FixedExpense'),
                (@Subscription, 'Subscription');",
            new Dictionary<string, object?>
            {
                ["Housing"] = HousingCategoryId,
                ["Food"] = FoodCategoryId,
                ["Transport"] = TransportCategoryId,
                ["Fixed"] = FixedExpenseCategoryId,
                ["Subscription"] = SubscriptionCategoryId
            },
            ct);
    }

    private async Task EnsureBaselineIncomeAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        var count = await QueryIntAsync(
            "SELECT COUNT(*) FROM Income WHERE BudgetId = @BudgetId;",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (count > 0)
            return;

                var incomeId = Guid.NewGuid();

        await ExecuteAsync(
            @"INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, CreatedByUserId)
                            VALUES (@IncomeId, @BudgetId, @NetSalaryMonthly, @SalaryFrequency, @Persoid);",
            new Dictionary<string, object?>
            {
                ["IncomeId"] = incomeId,
                                ["BudgetId"] = budgetId,
                ["NetSalaryMonthly"] = 32000m,
                ["SalaryFrequency"] = 3,
                                ["Persoid"] = persoid
            },
            ct);

        await ExecuteAsync(
            @"INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
                            VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @Persoid);",
            new Dictionary<string, object?>
            {
                                ["Id"] = Guid.NewGuid(),
                ["IncomeId"] = incomeId,
                ["Name"] = "Freelance",
                ["IncomeMonthly"] = 2500m,
                ["Frequency"] = 3,
                                ["Persoid"] = persoid
            },
            ct);

        await ExecuteAsync(
            @"INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
                            VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @Persoid);",
            new Dictionary<string, object?>
            {
                                ["Id"] = Guid.NewGuid(),
                ["IncomeId"] = incomeId,
                ["Name"] = "Partner contribution",
                ["IncomeMonthly"] = 1800m,
                ["Frequency"] = 3,
                                ["Persoid"] = persoid
            },
            ct);
    }

    private async Task EnsureBaselineExpensesAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        await EnsureExpenseItemExistsAsync(budgetId, persoid, HousingCategoryId, "Rent", 12000m, ct);
        await EnsureExpenseItemExistsAsync(budgetId, persoid, FoodCategoryId, "Groceries", 3200m, ct);
        await EnsureExpenseItemExistsAsync(budgetId, persoid, TransportCategoryId, "Transport Pass", 850m, ct);
        await EnsureExpenseItemExistsAsync(budgetId, persoid, FixedExpenseCategoryId, "Electricity", 720m, ct);
        await EnsureExpenseItemExistsAsync(budgetId, persoid, FixedExpenseCategoryId, "Phone & Internet", 650m, ct);
        await EnsureExpenseItemExistsAsync(budgetId, persoid, SubscriptionCategoryId, "Streaming", 199m, ct);
    }

    private Task EnsureExpenseItemExistsAsync(
        Guid budgetId,
        Guid persoid,
                Guid categoryId,
        string name,
        decimal amount,
        CancellationToken ct)
    {
        return ExecuteAsync(
            @"INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedByUserId)
                            SELECT @Id, @BudgetId, @CategoryId, @Name, @Amount, @Persoid
              FROM DUAL
              WHERE NOT EXISTS (
                SELECT 1
                FROM ExpenseItem
                                WHERE BudgetId = @BudgetId
                  AND Name = @Name
                LIMIT 1
              );",
            new Dictionary<string, object?>
            {
                                ["Id"] = Guid.NewGuid(),
                                ["BudgetId"] = budgetId,
                ["CategoryId"] = categoryId,
                ["Name"] = name,
                ["Amount"] = amount,
                                ["Persoid"] = persoid
            },
            ct);
    }

    private async Task EnsureBaselineSavingsAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        var count = await QueryIntAsync(
            "SELECT COUNT(*) FROM Savings WHERE BudgetId = @BudgetId;",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (count > 0)
            return;

                var savingsId = Guid.NewGuid();

        await ExecuteAsync(
            @"INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedByUserId)
                            VALUES (@SavingsId, @BudgetId, @MonthlySavings, @Persoid);",
            new Dictionary<string, object?>
            {
                ["SavingsId"] = savingsId,
                                ["BudgetId"] = budgetId,
                ["MonthlySavings"] = 3000m,
                                ["Persoid"] = persoid
            },
            ct);

        await ExecuteAsync(
            @"INSERT INTO SavingsGoal
              (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedByUserId)
              VALUES
                            (@GoalId, @SavingsId, @Name, @TargetAmount, @TargetDate, @AmountSaved, @MonthlyContribution, @Persoid);",
            new Dictionary<string, object?>
            {
                                ["GoalId"] = Guid.NewGuid(),
                ["SavingsId"] = savingsId,
                ["Name"] = "Emergency Fund",
                ["TargetAmount"] = 100000m,
                ["TargetDate"] = DateTime.UtcNow.AddYears(2).Date,
                ["AmountSaved"] = 40000m,
                ["MonthlyContribution"] = 1500m,
                                ["Persoid"] = persoid
            },
            ct);
    }

    private async Task EnsureBaselineDebtsAsync(Guid budgetId, Guid persoid, CancellationToken ct)
    {
        var count = await QueryIntAsync(
            "SELECT COUNT(*) FROM Debt WHERE BudgetId = @BudgetId AND Status = 'active';",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (count > 0)
            return;

        await ExecuteAsync(
            @"INSERT INTO Debt
              (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, CreatedByUserId)
              VALUES
                            (@CardId, @BudgetId, 'Credit Card', 'revolving', @CardBalance, @CardApr, @CardFee, @CardMinPayment, NULL, @Persoid),
                            (@LoanId, @BudgetId, 'Student Loan', 'installment', @LoanBalance, @LoanApr, @LoanFee, @LoanMinPayment, @LoanTermMonths, @Persoid);",
            new Dictionary<string, object?>
            {
                                ["CardId"] = Guid.NewGuid(),
                                ["LoanId"] = Guid.NewGuid(),
                                ["BudgetId"] = budgetId,
                ["CardBalance"] = 18500m,
                ["CardApr"] = 19.9m,
                ["CardFee"] = 25m,
                ["CardMinPayment"] = 500m,
                ["LoanBalance"] = 95000m,
                ["LoanApr"] = 1.2m,
                ["LoanFee"] = 0m,
                ["LoanMinPayment"] = 1500m,
                ["LoanTermMonths"] = 72,
                ["Persoid"] = persoid
            },
            ct);
    }

    private async Task EnsureNoExistingMonthsAsync(Guid budgetId, CancellationToken ct)
    {
        var monthsCount = await QueryIntAsync(
            "SELECT COUNT(*) FROM BudgetMonth WHERE BudgetId = @BudgetId;",
            new Dictionary<string, object?> { ["BudgetId"] = budgetId },
            ct);

        if (monthsCount > 0)
        {
            throw new InvalidOperationException(
                "Budget already has month rows. Refusing to append seed months to existing timeline.");
        }
    }

    private async Task StartMonthAsync(
        Guid persoid,
        string targetYearMonth,
        bool closePreviousOpenMonth,
        string carryOverMode,
        CancellationToken ct)
    {
        var request = new StartBudgetMonthRequestDto(
            TargetYearMonth: targetYearMonth,
            ClosePreviousOpenMonth: closePreviousOpenMonth,
            CarryOverMode: carryOverMode,
            CarryOverAmount: null,
            CreateSkippedMonths: false);

        var result = await _mediator.Send(
            new StartBudgetMonthCommand(persoid, persoid, request),
            ct);

        if (result.IsFailure)
        {
            throw new InvalidOperationException(
                $"Could not create month {targetYearMonth}: {result.Error.Code} - {result.Error.Description}");
        }
    }

    private async Task<EnsureBudgetMonthLifecycleResult> EnsureMaterializedMonthAsync(
        Guid persoid,
        string yearMonth,
        CancellationToken ct)
    {
        var result = await _monthLifecycle.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            yearMonth,
            ct);

        if (result.IsFailure || result.Value is null)
        {
            throw new InvalidOperationException(
                $"Could not materialize month {yearMonth}: {result.Error.Code} - {result.Error.Description}");
        }

        return result.Value;
    }

    private async Task OverrideExpenseAmountAsync(
        Guid budgetMonthId,
        Guid actorPersoid,
        string expenseName,
        decimal newAmount,
        CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var lookup = conn.CreateCommand();
        lookup.Transaction = _uow.Transaction;
        lookup.CommandText = @"
            SELECT
                Id,
                SourceExpenseItemId,
                AmountMonthly
            FROM BudgetMonthExpenseItem
            WHERE BudgetMonthId = @BudgetMonthId
              AND Name = @ExpenseName
              AND IsDeleted = 0
            ORDER BY CreatedAt
            LIMIT 1;";

        AddParameter(lookup, "BudgetMonthId", budgetMonthId);
        AddParameter(lookup, "ExpenseName", expenseName);

        Guid entityId;
        Guid? sourceEntityId;
        decimal oldAmount;

        await using (var reader = await lookup.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct))
            {
                throw new InvalidOperationException(
                    $"Could not find month expense '{expenseName}' in month {budgetMonthId}.");
            }

            entityId = reader.GetGuid(0);
            sourceEntityId = reader.IsDBNull(1) ? null : reader.GetGuid(1);
            oldAmount = reader.GetDecimal(2);
        }

        if (oldAmount == newAmount)
            return;

        await ExecuteAsync(
            @"UPDATE BudgetMonthExpenseItem
              SET AmountMonthly = @AmountMonthly,
                  IsOverride = 1,
                  UpdatedAt = UTC_TIMESTAMP(),
                  UpdatedByUserId = @ActorPersoid
              WHERE BudgetMonthId = @BudgetMonthId
                AND Name = @ExpenseName
                AND IsDeleted = 0;",
            new Dictionary<string, object?>
            {
                ["AmountMonthly"] = newAmount,
                ["ActorPersoid"] = actorPersoid,
                ["BudgetMonthId"] = budgetMonthId,
                ["ExpenseName"] = expenseName
            },
            ct);

        await ExecuteAsync(
            @"INSERT INTO BudgetMonthChangeEvent
                (Id, BudgetMonthId, EntityType, EntityId, SourceEntityId, ChangeType, FieldName, OldValueText, NewValueText, ChangedByUserId)
              VALUES
                                (@Id, @BudgetMonthId, 'ExpenseItem', @EntityId, @SourceEntityId,
                                 'updated', 'AmountMonthly', @OldValueText, @NewValueText, @ChangedByUserId);",
            new Dictionary<string, object?>
            {
                                ["Id"] = Guid.NewGuid(),
                                ["BudgetMonthId"] = budgetMonthId,
                ["EntityId"] = entityId,
                ["SourceEntityId"] = sourceEntityId,
                ["OldValueText"] = oldAmount.ToString("0.00", CultureInfo.InvariantCulture),
                ["NewValueText"] = newAmount.ToString("0.00", CultureInfo.InvariantCulture),
                                ["ChangedByUserId"] = actorPersoid
            },
            ct);
    }

    private async Task<int> QueryIntAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var scalar = await ExecuteScalarAsync(sql, parameters, ct);
        return Convert.ToInt32(scalar, CultureInfo.InvariantCulture);
    }

    private async Task<Guid?> QueryGuidAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var scalar = await ExecuteScalarAsync(sql, parameters, ct);
        if (scalar is null || scalar == DBNull.Value)
            return null;

        if (scalar is Guid guid)
            return guid;

        if (scalar is byte[] bytes && bytes.Length == 16)
            return new Guid(bytes);

        if (Guid.TryParse(Convert.ToString(scalar, CultureInfo.InvariantCulture), out var parsed))
            return parsed;

        return null;
    }

    private async Task<object?> ExecuteScalarAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = _uow.Transaction;
        cmd.CommandText = sql;

        foreach (var pair in parameters)
            AddParameter(cmd, pair.Key, pair.Value);

        return await cmd.ExecuteScalarAsync(ct);
    }

    private async Task<int> ExecuteAsync(string sql, IReadOnlyDictionary<string, object?> parameters, CancellationToken ct)
    {
        var conn = await _uow.GetOpenConnectionAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = _uow.Transaction;
        cmd.CommandText = sql;

        foreach (var pair in parameters)
            AddParameter(cmd, pair.Key, pair.Value);

        return await cmd.ExecuteNonQueryAsync(ct);
    }

    private static void AddParameter(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = "@" + name;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }
}
