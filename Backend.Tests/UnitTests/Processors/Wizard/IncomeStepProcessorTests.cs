using Backend.Application.Services.WizardServices.Processors;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Enums;
using Backend.Domain.Interfaces.Repositories.Budget;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Backend.Tests.UnitTests.Processors.Wizard
{
    public class IncomeStepProcessorTests
    {
        private const string FailureMsg = "An error occurred in the 'IncomeStepProcessor'. Please try again later or contact support if the issue persists.";
        // ------------------------------------------------------------------ //
        // Helper – build a valid wizard‑style JSON payload (flat structure)   //
        // ------------------------------------------------------------------ //
        private static string BuildValidJson(decimal salary, string salaryFreq, decimal hustleIncome, string hustleFreq)
            => $@"{{
                    ""netSalary"": {salary},
                    ""showSideIncome"": true,
                    ""showHouseholdMembers"": false,
                    ""salaryFrequency"": ""{salaryFreq}"",
                    ""householdMembers"": [],
                    ""sideHustles"": [
                    {{ ""name"": ""akassa"", ""income"": {hustleIncome}, ""frequency"": ""{hustleFreq}"" }}
                    ]
                }}";

        // ------------------------------------------------------------------ //
        // 1. Happy‑path test                                                 //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithValidIncomeData_CallsRepositoryWithCorrectlyMappedObject()
        {
            var budgetId = Guid.NewGuid();
            var validJson = BuildValidJson(50_000M, "monthly", 1_111M, "monthly");

            var incomeRepoMock = new Mock<IIncomeRepository>();
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ILogger<IncomeStepProcessor>>());

            var result = await processor.ProcessAsync(validJson, budgetId);

            Assert.True(result.Success);

            incomeRepoMock.Verify(repo => repo.AddAsync(
                It.Is<Income>(inc =>
                    inc.BudgetId == budgetId &&
                    inc.NetSalaryMonthly == 50_000M &&
                    inc.SalaryFrequency == Frequency.Monthly &&
                    inc.SideHustles.Count == 1 &&
                    inc.SideHustles.First().Name == "akassa" &&
                    inc.SideHustles.First().IncomeMonthly == 1_111M),
                budgetId),
                Times.Once);
        }

        // ------------------------------------------------------------------ //
        // 2. Malformed‑JSON test                                             //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithMalformedJson_ReturnsFailureAndDoesNotCallRepository()
        {
            var malformedJson = @"{ ""netSalary"": 50000, ""sideHustles"": ["; // broken
            var budgetId = Guid.NewGuid();

            var incomeRepoMock = new Mock<IIncomeRepository>();
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ILogger<IncomeStepProcessor>>());

            var result = await processor.ProcessAsync(malformedJson, budgetId);

            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            incomeRepoMock.Verify(repo =>
                repo.AddAsync(It.IsAny<Income>(), It.IsAny<Guid>()), Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 3. Type‑mismatch test                                             //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithPropertyTypeMismatch_ReturnsFailureAndDoesNotCallRepository()
        {
            var invalidJson = @"{ ""netSalary"": ""a lot"" }"; // salary should be number
            var budgetId = Guid.NewGuid();

            var incomeRepoMock = new Mock<IIncomeRepository>();
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ILogger<IncomeStepProcessor>>());

            var result = await processor.ProcessAsync(invalidJson, budgetId);

            Assert.False(result.Success);
            Assert.Equal(FailureMsg, result.Message);

            incomeRepoMock.Verify(repo =>
                repo.AddAsync(It.IsAny<Income>(), It.IsAny<Guid>()), Times.Never);
        }

        // ------------------------------------------------------------------ //
        // 4. Empty‑object test                                               //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WithEmptyJsonObject_CallsRepositoryWithDefaults()
        {
            var emptyJson = "{}";
            var budgetId = Guid.NewGuid();

            var incomeRepoMock = new Mock<IIncomeRepository>();
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ILogger<IncomeStepProcessor>>());

            var result = await processor.ProcessAsync(emptyJson, budgetId);

            Assert.True(result.Success);

            incomeRepoMock.Verify(repo => repo.AddAsync(
                It.Is<Income>(inc =>
                    inc.BudgetId == budgetId &&
                    inc.NetSalaryMonthly == 0 &&
                    inc.SideHustles.Count == 0 &&
                    inc.HouseholdMembers.Count == 0),
                budgetId),
                Times.Once);
        }

        // ------------------------------------------------------------------ //
        // 5. Repository‑throws test                                          //
        // ------------------------------------------------------------------ //
        [Fact]
        public async Task ProcessAsync_WhenRepositoryThrows_ReturnsFailureAndLogsError()
        {
            var validJson = "{}";          // minimal valid
            var budgetId = Guid.NewGuid();

            var dbException = new InvalidOperationException("DB down");
            var incomeRepoMock = new Mock<IIncomeRepository>();
            incomeRepoMock
                .Setup(r => r.AddAsync(It.IsAny<Income>(), It.IsAny<Guid>()))
                .ThrowsAsync(dbException);

            var loggerMock = new Mock<ILogger<IncomeStepProcessor>>();

            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
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
