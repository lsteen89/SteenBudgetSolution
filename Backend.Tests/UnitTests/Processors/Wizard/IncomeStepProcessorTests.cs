using Backend.Application.Services.WizardServices.Processors;
using Backend.Domain.Abstractions;
using Backend.Domain.Interfaces.Repositories.Budget;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Backend.Domain.Entities.Budget;

namespace Backend.Tests.UnitTests.Processors.Wizard
{
    public class IncomeStepProcessorTests
    {
        [Fact]
        public async Task ProcessAsync_WithValidIncomeData_CallsRepositoryWithCorrectlyMappedObject()
        {
            // --- Arrange ---

            // 1. Use the correct, valid JSON for Income data that you provided.
            var validJson = @"{""netSalary"":50000,""showSideIncome"":true,""showHouseholdMembers"":false,""salaryFrequency"":""monthly"",""householdMembers"":[],""sideHustles"":[{""name"":""akassa"",""income"":1111,""frequency"":""monthly"",""yearlyIncome"":13332}]}";
            var budgetId = Guid.NewGuid();

            // 2. The mock and processor are correctly set up for Income.
            var incomeRepoMock = new Mock<IIncomeRepository>();

            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<IncomeStepProcessor>>());

            // --- Act ---
            var result = await processor.ProcessAsync(validJson, budgetId);

            // --- Assert ---
            Assert.True(result.Success);

            // 3. Verify the key properties from the JSON were mapped correctly to the domain object.
            incomeRepoMock.Verify(
                repo => repo.AddAsync(
                    It.Is<Income>(income =>
                        income.NetSalary == 50000 &&
                        income.BudgetId == budgetId &&
                        income.SideHustles.Count == 1 &&
                        income.SideHustles.First().Name == "akassa"
                    ),
                    budgetId
                ),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_WithMalformedJson_ReturnsFailureAndDoesNotCallRepository()
        {
            // --- Arrange ---
            // 1. A corrupted JSON string, now relevant to Income data.
            var malformedJson = @"{ ""netSalary"": 50000, ""sideHustles"": ["; // Intentionally unclosed
            var budgetId = Guid.NewGuid();

            // 2. The mock dependency for the Income repository.
            var incomeRepoMock = new Mock<IIncomeRepository>();

            // 3. The real IncomeStepProcessor we are testing.
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<IncomeStepProcessor>>());

            // --- Act ---
            // 4. Run the processor with the corrupted data.
            var result = await processor.ProcessAsync(malformedJson, budgetId);

            // --- Assert ---
            // 5. Check for the correct failure message from the Income processor.
            Assert.False(result.Success);
            Assert.Equal("An error occurred while processing the income step.", result.Message);

            // 6. Prove the database was never touched.
            incomeRepoMock.Verify(
                repo => repo.AddAsync(It.IsAny<Income>(), It.IsAny<Guid>()),
                Times.Never);
        }
        [Fact]
        public async Task ProcessAsync_WithPropertyTypeMismatch_ReturnsFailureAndDoesNotCallRepository()
        {
            // --- Arrange ---
            // 1. The JSON is for Income, but the data type for 'netSalary' is wrong.
            var invalidJson = @"{ ""netSalary"": ""a lot"" }"; // string instead of number
            var budgetId = Guid.NewGuid();

            // 2. The mock dependency.
            var incomeRepoMock = new Mock<IIncomeRepository>();

            // 3. The real object we are testing.
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<IncomeStepProcessor>>());

            // --- Act ---
            // 4. Run the processor with the invalid data type.
            var result = await processor.ProcessAsync(invalidJson, budgetId);

            // --- Assert ---
            // 5. Assert the failure. This will now pass.
            Assert.False(result.Success);
            Assert.Equal("An error occurred while processing the income step.", result.Message);

            // 6. Prove that the failure was caught early and the database was not called.
            incomeRepoMock.Verify(
                repo => repo.AddAsync(It.IsAny<Income>(), It.IsAny<Guid>()),
                Times.Never);
        }
        [Fact]
        public async Task ProcessAsync_WithEmptyJsonObject_CallsRepositoryWithEmptyObject()
        {
            // --- Arrange ---
            // 1. The input is an empty but valid JSON object.
            var emptyJson = "{}";
            var budgetId = Guid.NewGuid();

            // 2. The mock dependency.
            var incomeRepoMock = new Mock<IIncomeRepository>();

            // 3. The real object we are testing.
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<IncomeStepProcessor>>());

            // --- Act ---
            // 4. Run the processor with the empty data.
            var result = await processor.ProcessAsync(emptyJson, budgetId);

            // --- Assert ---
            // 5. The operation should still be considered a success.
            Assert.True(result.Success);

            // 6. Verify the repository was called once with a "default" Income object.
            //    We now check for Income-specific properties.
            incomeRepoMock.Verify(
                repo => repo.AddAsync(
                    It.Is<Income>(inc =>
                        inc.BudgetId == budgetId &&
                        inc.NetSalary == 0 && // Default for decimal
                        inc.SideHustles.Count == 0 && // Collections should be empty
                        inc.HouseholdMembers.Count == 0),
                    budgetId
                ),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_WhenRepositoryThrows_ReturnsFailureAndLogsError()
        {
            // --- Arrange ---
            // 1. Provide valid data to ensure the process reaches the repository call.
            var validJson = "{}";
            var budgetId = Guid.NewGuid();

            // 2. Command the repository mock to throw an exception when called.
            var incomeRepoMock = new Mock<IIncomeRepository>();
            var dbException = new InvalidOperationException("The database is sleeping.");
            incomeRepoMock
                .Setup(repo => repo.AddAsync(It.IsAny<Income>(), It.IsAny<Guid>()))
                .ThrowsAsync(dbException);

            // 3. Create a verifiable logger to ensure the error is recorded.
            var loggerMock = new Mock<ILogger<IncomeStepProcessor>>();

            // 4. Create the real processor with our failing repository.
            var processor = new IncomeStepProcessor(
                incomeRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                loggerMock.Object);

            // --- Act ---
            // 5. Run the processor, which will trigger the exception internally.
            var result = await processor.ProcessAsync(validJson, budgetId);

            // --- Assert ---
            // 6. Assert that the operation correctly reported a failure.
            Assert.False(result.Success);
            Assert.Equal("An error occurred while processing the income step.", result.Message);

            // 7. Verify that the exception was logged at the Error level.
            //    This proves our catch block is working as intended.
            loggerMock.Verify(
                log => log.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Error processing income step.")),
                    dbException, // We can even assert that the correct exception was logged.
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }
    }
}
