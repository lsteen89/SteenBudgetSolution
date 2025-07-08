using Backend.Application.Validators.WizardValidation;
using Backend.Contracts.Wizard;
using Backend.Tests.UnitTests.Services.WizardService.FlowTests;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using System.Data.Common;
using System.Text.Json;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;

namespace Backend.Tests.UnitTests.Services.WizardService.ValidationTests
{
    // ────────────────────────────────────────────────────────────────────────────
    //  EXTRA VALIDATION TESTS - 
    // ────────────────────────────────────────────────────────────────────────────
    public class WizardServiceValidationTests : WizardServiceTestsSaveStepData
    {
        // ──────────────── Income ───────────────────────────────────────────────
        [Fact]
        public async Task SaveStepDataAsync_Step1_SideHustlesHiddenButProvided_Throws()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 40_000m,
                SalaryFrequency = Frequency.Monthly,

                ShowSideIncome = false,          // section hidden
                SideHustles = new()           // but data sent → must fail
        {
            new() { Name = "Dev-blog", Income = 1_000m, Frequency = Frequency.Monthly }
        }
            };
            string json = JsonSerializer.Serialize(dto, Camel);
            var wizardSessionId = Guid.NewGuid();
            // 1️⃣  real failing validator for step 1
            var incomeValidator = new IncomeValidator();

            // 2️⃣  pass-through mocks for steps 2 & 3
            var expensesValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;
            var savingsValidator = CreatePassingValidatorMock<SavingsFormValues>().Object;

            // 3️⃣  DB should NEVER be hit on validation failure
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                    It.IsAny<string>(), It.IsAny<int>(),
                    It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,
                expensesValidator,
                savingsValidator,
                Mock.Of<ILogger<WizardServiceClass>>());

            // ─── Act & Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 1, 2, json, 2));

            Assert.Contains("side hustles should not be provided", ex.Message, StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step1_DuplicateHouseholdMemberIds_Throws()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            string dup = Guid.NewGuid().ToString();

            var dto = new IncomeFormValues
            {
                ShowHouseholdMembers = true,      // section shown  
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new()     
                {
                    new() { Id = dup, Name = "A", Income = 1m, Frequency = Frequency.Monthly },
                    new() { Id = dup, Name = "B", Income = 1m, Frequency = Frequency.Monthly }
                }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // real validator for *this* rule
            var incomeValidator = new IncomeValidator();
            var wizardSessionId = Guid.NewGuid();
            // cheap pass-through mocks for the other steps
            var expensesValidator = new Mock<IValidator<ExpenditureFormValues>>();
            expensesValidator.Setup(v => v.Validate(It.IsAny<ExpenditureFormValues>()))
                             .Returns(new ValidationResult());

            var savingsValidator = new Mock<IValidator<SavingsFormValues>>();
            savingsValidator.Setup(v => v.Validate(It.IsAny<SavingsFormValues>()))
                            .Returns(new ValidationResult());

            // ensure DB path is never used
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                    It.IsAny<string>(), It.IsAny<int>(),
                    It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,
                expensesValidator.Object,
                savingsValidator.Object,
                Mock.Of<ILogger<WizardServiceClass>>());

            // ─── Act & Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 1, 2, json, 2));

            Assert.Contains("duplicate household-member IDs", ex.Message, StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }


        // ───── helper: map the path used in MemberData → fragment we expect in the error text
        private static string ExpectedFragment(string path) => path switch
        {
            "monthlyRent" => "Monthly Rent",
            "monthlyFuelCost" => "Monthly Fuel Cost",
            "customSubscriptions[0].cost" => "'cost'",
            _ => throw new ArgumentOutOfRangeException(nameof(path))
        };
        public static IEnumerable<object[]> BadExpenseCases => new[]
        {
                new object[] { (decimal?)-10m, "monthlyRent"             }, // negative rent
                new object[] { (decimal?)-5m,  "monthlyFuelCost"         }, // negative fuel cost
                new object[] { (decimal?)null, "customSubscriptions[0].cost" } // missing cost
            };
        // ─────── expenditure validation with real validator ───────────────────────
        [Theory]
        [MemberData(nameof(BadExpenseCases))]
        public async Task SaveStepDataAsync_Step2_BadExpenditure_Throws(decimal? badNumber, string path)
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var dto = new ExpenditureFormValues
            {
                Rent = new Rent
                {
                    HomeType = path == "monthlyRent" ? "rent" : "renter",
                    MonthlyRent = path == "monthlyRent" ? badNumber : 500m
                },
                Transport = new Transport
                {
                    MonthlyFuelCost = path == "monthlyFuelCost" ? badNumber : 200m
                },
                // Correctly initialize the nested SubscriptionsSubForm
                Subscriptions = new SubscriptionsSubForm
                {
                    CustomSubscriptions = new List<SubscriptionItem?>
            {
                new SubscriptionItem
                {
                    Name = "Netflix",
                    // Check for the correct path and set the correct property
                    Cost = path == "customSubscriptions[0].cost" ? badNumber : 99m
                }
            }
                }
            };

            string json = JsonSerializer.Serialize(dto, Camel);
            var wizardSessionId = Guid.NewGuid();
            var expenseValidator = new ExpenditureValidator(); // Real validator for step 2

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                CreatePassingValidatorMock<IncomeFormValues>().Object,
                expenseValidator,
                CreatePassingValidatorMock<SavingsFormValues>().Object,
                Mock.Of<ILogger<WizardServiceClass>>());

            // ─── Act & Assert ───────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 2, 1, json, 2));

            // This assertion will now pass if the path in MemberData is correct
            Assert.Contains(ExpectedFragment(path),
                              ex.Message,
                              StringComparison.OrdinalIgnoreCase);
        }


        // ──────────────── Savings (step 3) ─────────────────────────────────────
        [Fact]
        public async Task SaveStepDataAsync_Step3_NegativeOrZeroGoal_Throws()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dto = new SavingsFormValues
            {
                Goals = new()     // instantiate the list first
                {
                    new() { Id = Guid.NewGuid().ToString(), Name = "Emergency" , TargetAmount = 0 } // ≤ 0
                }
            };
            string json = JsonSerializer.Serialize(dto, Camel);
            var wizardSessionId = Guid.NewGuid();
            // 1️⃣  real validator for Savings (expects Amount > 0)
            var savingsValidator = new SavingsValidator();          // <-- your real rule set

            // 2️⃣  pass-through mocks for Income & Expenditure
            var incomeValidator = CreatePassingValidatorMock<IncomeFormValues>().Object;
            var expenseValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;

            // 3️⃣  DB layer should never be hit on validation failure
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                    It.IsAny<string>(), It.IsAny<int>(),
                    It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,
                expenseValidator,
                savingsValidator,                  // <-- real one
                Mock.Of<ILogger<WizardServiceClass>>());

            // ─── Act & Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 3, 1, json, 2));

            Assert.Contains("Goal amount must be greater than 0", ex.Message);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step3_DuplicateGoalIds_Throws()
        {
            // duplicate Id to trigger the rule
            string dup = Guid.NewGuid().ToString();

            var dto = new SavingsFormValues
            {

                Intro = new SavingsIntro
                {
                    SavingHabit = "regular"
                },


                Habits = new SavingHabits
                {
                    MonthlySavings = 100m,
                    SavingMethods = new() { "automatic" }
                },

                // The Goals property remains the same
                Goals = new()
                {
                    new()
                    {
                        Id = dup,
                        Name = "A",
                        TargetAmount = 1000m,
                        TargetDate = DateTime.UtcNow.AddYears(1)
                    },
                    new()
                    {
                        Id = dup,
                        Name = "B",
                        TargetAmount = 2000m,
                        TargetDate = DateTime.UtcNow.AddYears(2)
                    } // duplicate
                }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // real validator for step-3
            var savingsValidator = new SavingsValidator();
            var wizardSessionId = Guid.NewGuid();
            // green-stub validators for the other steps
            var incomeValidator = CreatePassingValidatorMock<IncomeFormValues>().Object;
            var expenseValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;

            // SQL should never be hit on validation failure
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                    It.IsAny<string>(), It.IsAny<int>(),
                    It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,
                expenseValidator,
                savingsValidator,
                Mock.Of<ILogger<WizardServiceClass>>());

            // ─── Act & Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 3, 1, json, 2));

            Assert.Contains("duplicate goal IDs", ex.Message, StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }
    }
}
