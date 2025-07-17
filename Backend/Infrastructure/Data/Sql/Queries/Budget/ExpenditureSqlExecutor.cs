using Backend.Domain.Entities.Budget.Expenditure;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries;
using Dapper;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public class ExpenditureSqlExecutor : SqlBase, IExpenditureSqlExecutor
    {
        private readonly ILogger<ExpenditureSqlExecutor> _logger;

        public ExpenditureSqlExecutor(IUnitOfWork unitOfWork, ILogger<IncomeSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        public async Task InsertExpenditureAsync(Expenditure expenditure, Guid budgetId)
        {
            _logger.LogInformation("Inserting expenditure for budget {BudgetId}", budgetId);

            // --- Simple, Single-Record Expenses ---

            if (expenditure.Rent != null)
            {
                expenditure.Rent.Id = Guid.NewGuid();
                expenditure.Rent.BudgetId = budgetId;
                var rentSql = @"
                INSERT INTO `Rent`
                (
                    `Id`, `BudgetId`, `HomeType`, `MonthlyRent`,
                    `RentExtraFees`, `MonthlyFee`, `BrfExtraFees`,
                    `MortgagePayment`, `HouseOtherCosts`, `OtherCosts`
                )
                VALUES
                (
                    @Id, @BudgetId, @HomeType, @MonthlyRent,
                    @RentExtraFees, @MonthlyFee, @BrfExtraFees,
                    @MortgagePayment, @HouseOtherCosts, @OtherCosts
                );";
                await ExecuteAsync(rentSql, expenditure.Rent);
            }

            if (expenditure.Food != null)
            {
                expenditure.Food.Id = Guid.NewGuid();
                expenditure.Food.BudgetId = budgetId;
                var foodSql = @"
                INSERT INTO Food (Id, BudgetId, FoodStoreExpenses, TakeoutExpenses)
                VALUES (@Id, @BudgetId, @FoodStoreExpenses, @TakeoutExpenses);";
                await ExecuteAsync(foodSql, expenditure.Food);
            }

            if (expenditure.Transport != null)
            {
                expenditure.Transport.Id = Guid.NewGuid();
                expenditure.Transport.BudgetId = budgetId;
                var transportSql = @"
                INSERT INTO `Transport`
                (
                    `Id`, `BudgetId`,
                    `MonthlyFuelCost`, `MonthlyInsuranceCost`,
                    `MonthlyTotalCarCost`, `MonthlyTransitCost`
                )
                VALUES
                (
                    @Id, @BudgetId,
                    @MonthlyFuelCost, @MonthlyInsuranceCost,
                    @MonthlyTotalCarCost, @MonthlyTransitCost
                );";
                await ExecuteAsync(transportSql, expenditure.Transport);
            }

            if (expenditure.Clothing != null)
            {
                expenditure.Clothing.Id = Guid.NewGuid();
                expenditure.Clothing.BudgetId = budgetId;
                var clothingSql = @"
                INSERT INTO Clothing (Id, BudgetId, MonthlyClothingCost)
                VALUES (@Id, @BudgetId, @MonthlyClothingCost);";
                await ExecuteAsync(clothingSql, expenditure.Clothing);
            }

            // --- Parent-Child Expenses: FixedExpenses ---

            if (expenditure.FixedExpenses != null)
            {
                // 1. Create the parent record
                expenditure.FixedExpenses.Id = Guid.NewGuid();
                expenditure.FixedExpenses.BudgetId = budgetId;
                const string sqlFixed = @"
                INSERT INTO FixedExpenses (Id, BudgetId, Electricity, Insurance, Internet, Phone, UnionFees)
                VALUES (@Id, @BudgetId, @Electricity, @Insurance, @Internet, @Phone, @UnionFees);";
                await ExecuteAsync(sqlFixed, expenditure.FixedExpenses);

                // 2. Create the child records, linking them to the parent's new Id
                foreach (var item in expenditure.FixedExpenses.CustomExpenses)
                {
                    item.Id = Guid.NewGuid();
                    item.FixedExpensesId = expenditure.FixedExpenses.Id;
                    const string sqlItem = @"
                    INSERT INTO CustomFixedExpense (Id, FixedExpensesId, Name, Cost)
                    VALUES (@Id, @FixedExpensesId, @Name, @Cost);";
                    await ExecuteAsync(sqlItem, item);
                }
            }

            // --- Parent-Child Expenses: Subscriptions ---

            if (expenditure.Subscriptions != null)
            {
                // 1. Create the parent record
                expenditure.Subscriptions.Id = Guid.NewGuid();
                expenditure.Subscriptions.BudgetId = budgetId;
                const string sqlSubs = @"
                INSERT INTO `Subscriptions`
                (
                    `Id`, `BudgetId`,
                    `Netflix`, `Spotify`, `HBOMax`,
                    `Viaplay`, `DisneyPlus`
                )
                VALUES
                (
                    @Id, @BudgetId,
                    @Netflix, @Spotify, @HBOMax,
                    @Viaplay, @DisneyPlus
                );";
                await ExecuteAsync(sqlSubs, expenditure.Subscriptions);

                // 2. Create the child records
                foreach (var item in expenditure.Subscriptions.CustomSubscriptions)
                {
                    item.Id = Guid.NewGuid();
                    item.SubscriptionsId = expenditure.Subscriptions.Id;
                    const string sqlItem = @"
                    INSERT INTO CustomSubscription (Id, SubscriptionsId, Name, Cost)
                    VALUES (@Id, @SubscriptionsId, @Name, @Cost);";
                    await ExecuteAsync(sqlItem, item);
                }
            }
        }
    }
}
