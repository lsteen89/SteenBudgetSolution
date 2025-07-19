using Backend.Application.Services.WizardServices.Processors;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Expenditure; // Expense, ExpenseItem, ExpenseCategories
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Interfaces.Repositories.Budget;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Backend.Tests.UnitTests.Processors.Wizard
{
    public class ExpenseProcessorTests
    {
        private const string FailureMsg = "An error occurred in the 'ExpenseProcessor'. Please try again later or contact support if the issue persists.";

        // Helper – build minimal valid JSON fragment
        private const string ValidRentJson =
            @"{""rent"":{""homeType"":""rent"",""monthlyRent"":15000,""rentExtraFees"":500,""monthlyFee"":0,""mortgagePayment"":0}}";

        private const string FullMixedJson =
            @"{
                ""rent"":{""homeType"":""rent"",""monthlyRent"":15000,""rentExtraFees"":500,""monthlyFee"":0,""mortgagePayment"":0},
                ""food"":{""foodStoreExpenses"":1111,""takeoutExpenses"":2},
                ""fixedExpenses"":{""electricity"":2,""insurance"":1,""internet"":3,""phone"":4,""unionFees"":5,
                    ""customExpenses"":[{""name"":""Gym"", ""cost"":299}]},
                ""transport"":{""monthlyFuelCost"":1,""monthlyInsuranceCost"":2,""monthlyTotalCarCost"":3,""monthlyTransitCost"":1},
                ""clothing"":{""monthlyClothingCost"":1},
                ""subscriptions"":{""subscriptions"":[{""name"":""Netflix"", ""cost"":1.0},{""name"":""Spotify"", ""cost"":2.0}]}
              }";

        private ExpenseProcessor BuildProcessor(Mock<IExpenditureRepository> repoMock,
                                                        Mock<ILogger<ExpenseProcessor>>? loggerMock = null)
            => new(repoMock.Object, loggerMock?.Object ?? Mock.Of<ILogger<ExpenseProcessor>>());

        // ------------------------------------------------------------------ //
        // 1. Valid (Rent only)                                               //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithValidRentOnly_CreatesExpectedItems()
        {
            var budgetId = Guid.NewGuid();
            var repoMock = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repoMock);

            var result = await processor.ProcessAsync(ValidRentJson, budgetId);

            Assert.True(result.Success);

            repoMock.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.BudgetId == budgetId &&
                    e.Items.Any(i =>
                        i.CategoryId == ExpenseCategories.Rent &&
                        i.Name == "Rent" &&
                        i.AmountMonthly == 15000M) &&
                    e.Items.Any(i =>
                        i.CategoryId == ExpenseCategories.Rent &&
                        i.Name == "RentExtraFees" &&
                        i.AmountMonthly == 500M) &&
                    e.Items.Count == 2 // zero-value fields filtered out
                ),
                budgetId),
                Times.Once);
        }

        // ------------------------------------------------------------------ //
        // 2. Fully populated multi-section JSON                              //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithFullMixedData_FlattensAllSections()
        {
            var budgetId = Guid.NewGuid();
            var repoMock = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repoMock);

            var result = await processor.ProcessAsync(FullMixedJson, budgetId);

            Assert.True(result.Success);

            repoMock.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.BudgetId == budgetId &&
                    // rent
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.Rent && i.Name == "Rent" && i.AmountMonthly == 15000M) &&
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.Rent && i.Name == "RentExtraFees" && i.AmountMonthly == 500M) &&
                    // food
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.Food && i.Name == "FoodStore" && i.AmountMonthly == 1111M) &&
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.Food && i.Name == "Takeout" && i.AmountMonthly == 2M) &&
                    // fixed predefined
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.FixedExpense && i.Name == "Electricity" && i.AmountMonthly == 2M) &&
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.FixedExpense && i.Name == "Internet" && i.AmountMonthly == 3M) &&
                    // custom fixed
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.FixedExpense && i.Name == "Gym" && i.AmountMonthly == 299M) &&
                    // subscriptions
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.Subscription && i.Name == "Netflix" && i.AmountMonthly == 1M) &&
                    e.Items.Any(i => i.CategoryId == ExpenseCategories.Subscription && i.Name == "Spotify" && i.AmountMonthly == 2M)
                ),
                budgetId),
                Times.Once);
        }

        // ------------------------------------------------------------------ //
        // 3. Malformed JSON                                                  //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithMalformedJson_ReturnsFailure_NoRepoCalls()
        {
            var malformed = @"{ ""rent"": { ""monthlyRent"": 5000 "; // missing braces
            var budgetId = Guid.NewGuid();
            var repoMock = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repoMock);

            var result = await processor.ProcessAsync(malformed, budgetId);

            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            repoMock.Verify(r => r.AddAsync(It.IsAny<Expense>(), It.IsAny<Guid>()), Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 4. Type mismatch                                                   //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithTypeMismatch_ReturnsFailure_NoRepoCalls()
        {
            var invalid = @"{ ""rent"": { ""monthlyRent"": ""a lot"" } }";
            var budgetId = Guid.NewGuid();
            var repoMock = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repoMock);

            var result = await processor.ProcessAsync(invalid, budgetId);

            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            repoMock.Verify(r => r.AddAsync(It.IsAny<Expense>(), It.IsAny<Guid>()), Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 5. Empty JSON => success + zero items                              //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithEmptyObject_SucceedsWithZeroItems()
        {
            var empty = "{}";
            var budgetId = Guid.NewGuid();
            var repoMock = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repoMock);

            var result = await processor.ProcessAsync(empty, budgetId);

            Assert.True(result.Success);

            repoMock.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.BudgetId == budgetId &&
                    e.Items.Count == 0),
                budgetId),
                Times.Once);
        }

        // ------------------------------------------------------------------ //
        // 6. Repository throws                                               //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WhenRepositoryThrows_ReturnsFailureAndLogs()
        {
            var json = "{}";
            var budgetId = Guid.NewGuid();

            var repoMock = new Mock<IExpenditureRepository>();
            var dbEx = new InvalidOperationException("DB down");
            repoMock.Setup(r => r.AddAsync(It.IsAny<Expense>(), It.IsAny<Guid>()))
                    .ThrowsAsync(dbEx);

            var loggerMock = new Mock<ILogger<ExpenseProcessor>>();
            var processor = new ExpenseProcessor(repoMock.Object, loggerMock.Object);

            var result = await processor.ProcessAsync(json, budgetId);

            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            loggerMock.Verify(log => log.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, _) => v.ToString().Contains("Persistence error", StringComparison.OrdinalIgnoreCase)
                                               || v.ToString().Contains("An error occurred", StringComparison.OrdinalIgnoreCase)),
                    dbEx,
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_FiltersZeroAndNullAmounts()
        {
            var json = @"{ ""rent"": { ""monthlyRent"": 0, ""rentExtraFees"": null, ""mortgagePayment"": 2500 } }";
            var budgetId = Guid.NewGuid();
            var repo = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repo);

            var result = await processor.ProcessAsync(json, budgetId);
            Assert.True(result.Success);

            repo.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.Items.Count == 1 &&
                    e.Items.Single().Name == "MortgagePayment" &&
                    e.Items.Single().AmountMonthly == 2500M),
                budgetId),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_RoundsAmountsToTwoDecimals()
        {
            var json = @"{ ""food"": { ""foodStoreExpenses"": 123.4567 } }";
            var repo = new Mock<IExpenditureRepository>();
            var budgetId = Guid.NewGuid();
            var processor = BuildProcessor(repo);

            await processor.ProcessAsync(json, budgetId);

            repo.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.Items.Single().AmountMonthly == 123.46M),
                budgetId),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_CustomFixedExpensesOnly()
        {
            var json = @"{ ""fixedExpenses"": { ""customExpenses"": [
        { ""name"": ""Gym"", ""cost"": 199 },
        { ""name"": ""CloudBackup"", ""cost"": 49 }
    ] } }";
            var budgetId = Guid.NewGuid();
            var repo = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repo);

            await processor.ProcessAsync(json, budgetId);

            repo.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.Items.Count == 2 &&
                    e.Items.All(i => i.CategoryId == ExpenseCategories.FixedExpense) &&
                    e.Items.Any(i => i.Name == "Gym" && i.AmountMonthly == 199M) &&
                    e.Items.Any(i => i.Name == "CloudBackup" && i.AmountMonthly == 49M)),
                budgetId),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_TrimsCustomNames()
        {
            var json = @"{ ""fixedExpenses"": { ""customExpenses"": [
                { ""name"": ""  Gym  "", ""cost"": 100 }
            ] } }";
            var budgetId = Guid.NewGuid();
            var repo = new Mock<IExpenditureRepository>();
            var processor = BuildProcessor(repo);

            await processor.ProcessAsync(json, budgetId);

            repo.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.Items.Single().Name == "Gym"),
                budgetId),
                Times.Once);
        }
        [Fact]
        public void AddItem_WithUnknownCategory_Throws()
        {
            var exp = new Expense { BudgetId = Guid.NewGuid() };
            var invalidCat = Guid.NewGuid();
            Assert.Throws<InvalidOperationException>(() =>
                exp.AddItem(invalidCat, "Foo", 10M));
        }
        [Fact]
        public async Task ProcessAsync_DuplicateCustomNames_AreBothKept()
        {
            var json = @"{ ""fixedExpenses"": { ""customExpenses"": [
                { ""name"": ""Gym"", ""cost"": 50 },
                { ""name"": ""Gym"", ""cost"": 20 }
            ] } }";
            var repo = new Mock<IExpenditureRepository>();
            var budgetId = Guid.NewGuid();
            var processor = BuildProcessor(repo);

            await processor.ProcessAsync(json, budgetId);

            repo.Verify(r => r.AddAsync(
                It.Is<Expense>(e =>
                    e.Items.Count(i => i.Name == "Gym") == 2),
                budgetId),
                Times.Once);
        }

    }

}