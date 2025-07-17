using Backend.Application.Services.WizardServices.Processors;
using Backend.Domain.Abstractions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Backend.Domain.Entities.Budget.Expenditure;
using Backend.Domain.Interfaces.Repositories.Budget;

namespace Backend.Tests.UnitTests.Processors.Wizard
{
    public class ExpenditureStepProcessorTests
    {
        [Fact]
        public async Task ProcessAsync_WithValidData_CallsRepositoryWithCorrectlyMappedObject()
        {
            // Arrange
            // Use the complete and valid JSON string you provided.
            var validJson = @"{""rent"":{""homeType"":""rent"",""monthlyRent"":15000,""rentExtraFees"":500,""monthlyFee"":0,""mortgagePayment"":0}}";
            var budgetId = Guid.NewGuid();

            var expenditureRepoMock = new Mock<IExpenditureRepository>();

            var processor = new ExpenditureStepProcessor(
                expenditureRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<ExpenditureStepProcessor>>());

            // Act
            var result = await processor.ProcessAsync(validJson, budgetId);

            // Assert
            Assert.True(result.Success);

            // Verify the repository was called with the correctly mapped data from the JSON.
            expenditureRepoMock.Verify(
                repo => repo.AddAsync(
                    It.Is<Expenditure>(exp =>
                        exp.Rent.MonthlyRent == 15000 &&
                        exp.BudgetId == budgetId),
                    budgetId
                ),
                Times.Once);
        }
        [Fact]
        public async Task ProcessAsync_WithMalformedJson_ReturnsFailureAndDoesNotCallRepository()
        {
            // --- Arrange ---
            // 1. Prepare the corrupted data. This JSON is intentionally broken.
            var malformedJson = "{ \"rent\": { \"monthlyRent\": 5000"; // Missing closing brackets
            var budgetId = Guid.NewGuid();

            // 2. Create the mock dependency. We expect it to never be called.
            var expenditureRepoMock = new Mock<IExpenditureRepository>();

            // 3. Create the real object we are testing.
            var processor = new ExpenditureStepProcessor(
                expenditureRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<ExpenditureStepProcessor>>());

            // --- Act ---
            // 4. Run the processor with the corrupted data.
            var result = await processor.ProcessAsync(malformedJson, budgetId);

            // --- Assert ---
            // 5. Check that the operation correctly reported a failure.
            Assert.False(result.Success);
            Assert.Equal("An error occurred while processing the expenditure step.", result.Message);

            // 6. This is the most important check: prove the database was never touched.
            expenditureRepoMock.Verify(
                repo => repo.AddAsync(It.IsAny<Expenditure>(), It.IsAny<Guid>()),
                Times.Never);
        }
        [Fact]
        public async Task ProcessAsync_WithPropertyTypeMismatch_ReturnsFailureAndDoesNotCallRepository()
        {
            // --- Arrange ---
            // 1. The JSON is structurally valid, but the data type for 'monthlyRent' is wrong.
            var invalidJson = @"{ ""rent"": { ""monthlyRent"": ""a lot"" } }"; // string instead of number
            var budgetId = Guid.NewGuid();

            // 2. The mock dependency.
            var expenditureRepoMock = new Mock<IExpenditureRepository>();

            // 3. The real object we are testing.
            var processor = new ExpenditureStepProcessor(
                expenditureRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<ExpenditureStepProcessor>>());

            // --- Act ---
            // 4. Run the processor with the invalid data type.
            var result = await processor.ProcessAsync(invalidJson, budgetId);

            // --- Assert ---
            // 5. Assert the failure.
            Assert.False(result.Success);
            Assert.Equal("An error occurred while processing the expenditure step.", result.Message);

            // 6. Prove that the failure was caught early and the database was not called.
            expenditureRepoMock.Verify(
                repo => repo.AddAsync(It.IsAny<Expenditure>(), It.IsAny<Guid>()),
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
            var expenditureRepoMock = new Mock<IExpenditureRepository>();

            // 3. The real object we are testing.
            var processor = new ExpenditureStepProcessor(
                expenditureRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                Mock.Of<ILogger<ExpenditureStepProcessor>>());

            // --- Act ---
            // 4. Run the processor with the empty data.
            var result = await processor.ProcessAsync(emptyJson, budgetId);

            // --- Assert ---
            // 5. The operation should still be considered a success.
            Assert.True(result.Success);

            // 6. Verify the repository was called once with a "default" Expenditure object.
            //    We check that its nested properties are null, but its BudgetId is set correctly.
            expenditureRepoMock.Verify(
                repo => repo.AddAsync(
                    It.Is<Expenditure>(exp =>
                        exp.BudgetId == budgetId &&
                        exp.Rent == null &&
                        exp.Food == null &&
                        exp.Transport == null),
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
            var expenditureRepoMock = new Mock<IExpenditureRepository>();
            var dbException = new InvalidOperationException("The database is sleeping.");
            expenditureRepoMock
                .Setup(repo => repo.AddAsync(It.IsAny<Expenditure>(), It.IsAny<Guid>()))
                .ThrowsAsync(dbException);

            // 3. Create a verifiable logger to ensure the error is recorded.
            var loggerMock = new Mock<ILogger<ExpenditureStepProcessor>>();

            // 4. Create the real processor with our failing repository.
            var processor = new ExpenditureStepProcessor(
                expenditureRepoMock.Object,
                Mock.Of<ICurrentUserContext>(),
                loggerMock.Object);

            // --- Act ---
            // 5. Run the processor, which will trigger the exception internally.
            var result = await processor.ProcessAsync(validJson, budgetId);

            // --- Assert ---
            // 6. Assert that the operation correctly reported a failure.
            Assert.False(result.Success);
            Assert.Equal("An error occurred while processing the expenditure step.", result.Message);

            // 7. Verify that the exception was logged at the Error level.
            //    This proves our catch block is working as intended.
            loggerMock.Verify(
                log => log.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Error processing expenditure step.")),
                    dbException, // We can even assert that the correct exception was logged.
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }
    }
}
