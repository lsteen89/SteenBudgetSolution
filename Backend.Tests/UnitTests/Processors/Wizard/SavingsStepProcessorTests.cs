using Backend.Application.Services.WizardServices.Processors;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Interfaces.Repositories.Budget;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Backend.Tests.UnitTests.Processors.Wizard
{
    public class SavingsStepProcessorTests
    {
        private const string FailureMsg = "An error occurred in the 'SavingsStepProcessor'. Please try again later or contact support if the issue persists.";

        // Helper: build valid nested FE JSON payload
        private static string BuildValidJson(decimal monthly, string method, Guid goalId)
            => $@"{{
                ""intro"": {{ ""savingHabit"": ""automatic"" }},
                ""habits"": {{ ""monthlySavings"": {monthly}, ""savingMethods"": [""{method}""] }},
                ""goals"": [
                    {{
                        ""id"": ""{goalId}"",
                        ""name"": ""Emergency"",
                        ""targetAmount"": 10000,
                        ""targetDate"": ""2026-01-01"",
                        ""amountSaved"": 1200
                    }}
                ]
            }}";

        [Fact]
        public async Task ProcessAsync_WithValidSavingsData_CallsRepositoryWithCorrectlyMappedObject()
        {
            // Arrange
            var goalId = Guid.NewGuid();
            var validJson = BuildValidJson(8629M, "auto", goalId);
            var budgetId = Guid.NewGuid();

            var savingsRepoMock = new Mock<ISavingsRepository>();

            var processor = new SavingsStepProcessor(
                savingsRepoMock.Object,
                Mock.Of<ILogger<SavingsStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(validJson, budgetId);

            // Assert
            Assert.True(result.Success);

            savingsRepoMock.Verify(
                repo => repo.AddAsync(
                    It.Is<Savings>(s =>
                        s.BudgetId == budgetId &&
                        s.SavingHabit == "automatic" &&
                        s.MonthlySavings == 8629M &&
                        s.SavingMethods.Count == 1 &&
                        s.SavingMethods.First() == "auto" &&
                        s.SavingsGoals.Count == 1 &&
                        s.SavingsGoals.First().Name == "Emergency" &&
                        s.SavingsGoals.First().TargetAmount == 10000M &&
                        s.SavingsGoals.First().AmountSaved == 1200M &&
                        s.SavingsGoals.First().TargetDate.HasValue &&
                        s.SavingsGoals.First().TargetDate.Value.Date == new DateTime(2026, 1, 1)
                    ),
                    budgetId),
                Times.Once);
        }

        [Fact]
        public async Task ProcessAsync_WithMalformedJson_ReturnsFailureAndDoesNotCallRepository()
        {
            // Arrange
            // Broken JSON inside habits.savingMethods
            var malformedJson = @"{ ""intro"":{""savingHabit"":""automatic""},""habits"":{""monthlySavings"":8629,""savingMethods"":[";
            var budgetId = Guid.NewGuid();

            var savingsRepoMock = new Mock<ISavingsRepository>();

            var processor = new SavingsStepProcessor(
                savingsRepoMock.Object,
                Mock.Of<ILogger<SavingsStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(malformedJson, budgetId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            savingsRepoMock.Verify(
                repo => repo.AddAsync(It.IsAny<Savings>(), It.IsAny<Guid>()),
                Times.Never);
        }

        [Fact]
        public async Task ProcessAsync_WithPropertyTypeMismatch_ReturnsFailureAndDoesNotCallRepository()
        {
            // Arrange
            // monthlySavings is wrong type (string)
            var invalidJson = @"{ ""habits"":{ ""monthlySavings"":""lots"" } }";
            var budgetId = Guid.NewGuid();

            var savingsRepoMock = new Mock<ISavingsRepository>();

            var processor = new SavingsStepProcessor(
                savingsRepoMock.Object,
                Mock.Of<ILogger<SavingsStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(invalidJson, budgetId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            savingsRepoMock.Verify(
                repo => repo.AddAsync(It.IsAny<Savings>(), It.IsAny<Guid>()),
                Times.Never);
        }

        [Fact]
        public async Task ProcessAsync_WithEmptyJsonObject_CallsRepositoryWithEmptyObject()
        {
            // Arrange
            var emptyJson = "{}";
            var budgetId = Guid.NewGuid();

            var savingsRepoMock = new Mock<ISavingsRepository>();

            var processor = new SavingsStepProcessor(
                savingsRepoMock.Object,
                Mock.Of<ILogger<SavingsStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(emptyJson, budgetId);

            // Assert
            Assert.True(result.Success);

            savingsRepoMock.Verify(
                repo => repo.AddAsync(
                    It.Is<Savings>(s =>
                        s.BudgetId == budgetId &&
                        s.SavingHabit == null &&
                        s.MonthlySavings == 0 &&
                        s.SavingMethods.Count == 0 &&
                        s.SavingsGoals.Count == 0),
                    budgetId),
                Times.Once);
        }

        [Fact]
        public async Task ProcessAsync_WhenRepositoryThrows_ReturnsFailureAndLogsError()
        {
            // Arrange
            // Minimal valid payload (no goals/methods needed to reach repo call)
            var validJson = @"{""habits"":{""monthlySavings"":8629}}";
            var budgetId = Guid.NewGuid();

            var savingsRepoMock = new Mock<ISavingsRepository>();
            var dbException = new InvalidOperationException("DB down");
            savingsRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Savings>(), It.IsAny<Guid>()))
                .ThrowsAsync(dbException);

            var loggerMock = new Mock<ILogger<SavingsStepProcessor>>();

            var processor = new SavingsStepProcessor(
                savingsRepoMock.Object,
                loggerMock.Object);

            // Act
            var result = await processor.ProcessAsync(validJson, budgetId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            loggerMock.Verify(
                log => log.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, _) =>
                        v.ToString().Contains("savings", StringComparison.OrdinalIgnoreCase) &&
                        v.ToString().Contains("step", StringComparison.OrdinalIgnoreCase)),
                    dbException,
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

    }
}
