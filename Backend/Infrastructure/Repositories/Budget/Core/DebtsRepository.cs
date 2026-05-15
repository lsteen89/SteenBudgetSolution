using Backend.Domain.Entities.Budget.Debt;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Abstractions;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget.Core
{
    public class DebtsRepository : SqlBase, IDebtsRepository
    {
        private readonly ICurrentUserContext _currentUser;
        private readonly IDebtPaymentCalculator _paymentCalculator;

        public DebtsRepository(
            IUnitOfWork unitOfWork,
            ILogger<DebtsRepository> logger,
            ICurrentUserContext currentUser,
            IDebtPaymentCalculator paymentCalculator,
            IOptions<DatabaseSettings> db)
            : base(unitOfWork, logger, db)
        {
            _currentUser = currentUser;
            _paymentCalculator = paymentCalculator;
        }

        #region SQL Queries Insert
        private const string InsertNewDebtSql = @"
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, MonthlyPayment, CreatedByUserId)
            VALUES (@Id, @BudgetId, @Name, @Type, @Balance, @Apr, @MonthlyFee, @MinPayment, @TermMonths, @MonthlyPayment, @CreatedByUserId);";
        #endregion

        public async Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId, CancellationToken ct)
        {
            foreach (var d in debts)
            {
                // Ensure each expense ID is valid
                if (d.BudgetId == Guid.Empty)
                    d.BudgetId = budgetId;
            }

            var debtList = debts.ToList();
            var debtCount = debtList.Count;

            var createdByUserId = _currentUser.Persoid;

            if (createdByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            // Prepare the debts for insertion. MonthlyPayment is seeded from the
            // calculator so the planned payment column reflects the same value
            // the user saw during the wizard preview. It is editable later via
            // the month editor.
            foreach (var debt in debtList)
            {
                debt.Id = Guid.NewGuid();
                debt.BudgetId = budgetId;
                debt.CreatedByUserId = createdByUserId;
                debt.MonthlyPayment = _paymentCalculator.CalculateMonthlyPayment(
                    new DebtPaymentInput(debt));
            }
            _logger.LogInformation("Inserting debts for BudgetId {BudgetId}.", budgetId);
            // Execute the insert command for each debt
            await ExecuteAsync(InsertNewDebtSql, debtList, ct);
            _logger.LogInformation("Successfully inserted {Count} debts for BudgetId {BudgetId}.", debtCount, budgetId);
        }

        private sealed record DebtPaymentInput(Debt Debt) : IDebtPaymentInput
        {
            public string Type => Debt.Type;
            public decimal Balance => Debt.Balance;
            public decimal Apr => Debt.Apr;
            public decimal? MinPayment => Debt.MinPayment;
            public decimal? MonthlyFee => Debt.MonthlyFee;
            public int? TermMonths => Debt.TermMonths;
        }
    }
}

