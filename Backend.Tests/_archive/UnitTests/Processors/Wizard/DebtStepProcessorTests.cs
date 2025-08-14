using Backend.Application.Services.WizardServices.Processors;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Interfaces.Repositories.Budget;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Backend.Tests.UnitTests.Processors.Wizard
{
    public class DebtStepProcessorTests
    {
        private const string FailureMsg = "An error occurred in the 'DebtStepProcessor'. Please try again later or contact support if the issue persists.";

        // ------------------------------------------------------------------ //
        // Helper – build a valid wizard‑style JSON payload                   //
        // ------------------------------------------------------------------ //
        private static string BuildValidJson(string strategy) => $@"{{
            ""debts"": [
                {{
                    ""name"": ""Credit Card"",
                    ""type"": ""revolving"",
                    ""balance"": 15001,
                    ""apr"": 19.5,
                    ""minPayment"": 500
                }},
                {{
                    ""name"": ""Car Loan"",
                    ""type"": ""bank_loan"",
                    ""balance"": 120000,
                    ""apr"": 6.9,
                    ""termMonths"": 60
                }}
            ],
            ""summary"": {{
                ""repaymentStrategy"": ""{strategy}""
            }}
        }}";

        // ------------------------------------------------------------------ //
        // 1. Happy‑path test                                                 //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithValidData_CallsRepositoriesWithCorrectlyMappedObjects()
        {
            // Arrange
            var budgetId = Guid.NewGuid();
            var validJson = BuildValidJson("avalanche");

            var debtsRepoMock = new Mock<IDebtsRepository>();
            var budgetRepoMock = new Mock<IBudgetRepository>();
            var processor = new DebtStepProcessor(
                debtsRepoMock.Object,
                budgetRepoMock.Object,
                Mock.Of<ILogger<DebtStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(validJson, budgetId);

            // Assert
            Assert.True(result.Success);

            // Verify that the debt repository was called with the correct list of debts
            debtsRepoMock.Verify(repo => repo.AddDebtsAsync(
                It.Is<IReadOnlyList<Debt>>(debts =>
                    debts.Count == 2 &&
                    debts.Any(d => d.Name == "Credit Card" && d.Balance == 15001M && d.MinPayment == 500) &&
                    debts.Any(d => d.Name == "Car Loan" && d.Balance == 120000M && d.TermMonths == 60)
                ),
                budgetId),
                Times.Once);

            // Verify that the budget repository was called with the correct strategy
            budgetRepoMock.Verify(repo => repo.UpdateRepaymentStrategyAsync(
                "avalanche",
                budgetId),
                Times.Once);
        }

        // ------------------------------------------------------------------ //
        // 2. Malformed‑JSON test                                             //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithMalformedJson_ReturnsFailureAndDoesNotCallRepositories()
        {
            // Arrange
            var malformedJson = @"{ ""debts"": [ { ""name"": ""Credit Card"" "; // Broken JSON
            var budgetId = Guid.NewGuid();
            var debtsRepoMock = new Mock<IDebtsRepository>();
            var budgetRepoMock = new Mock<IBudgetRepository>();
            var processor = new DebtStepProcessor(debtsRepoMock.Object, budgetRepoMock.Object, Mock.Of<ILogger<DebtStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(malformedJson, budgetId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);
            debtsRepoMock.Verify(r => r.AddDebtsAsync(It.IsAny<IReadOnlyList<Debt>>(), It.IsAny<Guid>()), Times.Never);
            budgetRepoMock.Verify(r => r.UpdateRepaymentStrategyAsync(It.IsAny<string>(), It.IsAny<Guid>()), Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 3. Type‑mismatch test                                              //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithPropertyTypeMismatch_ReturnsFailureAndDoesNotCallRepositories()
        {
            // Arrange
            var invalidJson = @"{ ""debts"": [{ ""balance"": ""a lot"" }] }"; // Balance should be a number
            var budgetId = Guid.NewGuid();
            var debtsRepoMock = new Mock<IDebtsRepository>();
            var budgetRepoMock = new Mock<IBudgetRepository>();
            var processor = new DebtStepProcessor(debtsRepoMock.Object, budgetRepoMock.Object, Mock.Of<ILogger<DebtStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(invalidJson, budgetId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);
            debtsRepoMock.Verify(r => r.AddDebtsAsync(It.IsAny<IReadOnlyList<Debt>>(), It.IsAny<Guid>()), Times.Never);
            budgetRepoMock.Verify(r => r.UpdateRepaymentStrategyAsync(It.IsAny<string>(), It.IsAny<Guid>()), Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 4. Empty‑object test                                               //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithEmptyJsonObject_SucceedsAndCallsRepoWithEmptyList()
        {
            // Arrange
            var emptyJson = "{}";
            var budgetId = Guid.NewGuid();
            var debtsRepoMock = new Mock<IDebtsRepository>();
            var budgetRepoMock = new Mock<IBudgetRepository>();
            var processor = new DebtStepProcessor(debtsRepoMock.Object, budgetRepoMock.Object, Mock.Of<ILogger<DebtStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(emptyJson, budgetId);

            // Assert
            Assert.True(result.Success);

            // It should not call the debts repo with an empty list
            debtsRepoMock.Verify(repo => repo.AddDebtsAsync(
                It.Is<IReadOnlyList<Debt>>(d => !d.Any()),
                budgetId),
                Times.Never);

            // It should NOT call the budget repo since the strategy is null
            budgetRepoMock.Verify(repo => repo.UpdateRepaymentStrategyAsync(It.IsAny<string>(), It.IsAny<Guid>()),
                Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 5. Repository‑throws test                                          //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WhenRepositoryThrows_ReturnsFailureAndLogsError()
        {
            // Arrange
            var validJson = BuildValidJson("snowball");
            var budgetId = Guid.NewGuid();
            var dbException = new InvalidOperationException("DB is down");

            var debtsRepoMock = new Mock<IDebtsRepository>();
            debtsRepoMock
                .Setup(r => r.AddDebtsAsync(It.IsAny<IReadOnlyList<Debt>>(), It.IsAny<Guid>()))
                .ThrowsAsync(dbException);

            var budgetRepoMock = new Mock<IBudgetRepository>();
            var loggerMock = new Mock<ILogger<DebtStepProcessor>>();
            var processor = new DebtStepProcessor(debtsRepoMock.Object, budgetRepoMock.Object, loggerMock.Object);

            // Act
            var result = await processor.ProcessAsync(validJson, budgetId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            loggerMock.Verify(log => log.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, _) => v.ToString().Contains("An error occurred in DebtProcessor")),
                dbException,
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }
    }
}
