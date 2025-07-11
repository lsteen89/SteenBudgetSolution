﻿using Backend.Application.Validators.WizardValidation;
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

            // 1️⃣  real failing validator for step 1
            var incomeValidator = new IncomeValidator();

            // 2️⃣  pass-through mocks for steps 2 & 3
            var expensesValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;
            var savingsValidator = CreatePassingValidatorMock<SavingsFormValues>().Object;

            // 3️⃣  DB should NEVER be hit on validation failure
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
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
                wizardService.SaveStepDataAsync("sidetest", 1, 2, json, 2));

            Assert.Contains("side hustles should not be provided", ex.Message, StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
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

            // cheap pass-through mocks for the other steps
            var expensesValidator = new Mock<IValidator<ExpenditureFormValues>>();
            expensesValidator.Setup(v => v.Validate(It.IsAny<ExpenditureFormValues>()))
                             .Returns(new ValidationResult());

            var savingsValidator = new Mock<IValidator<SavingsFormValues>>();
            savingsValidator.Setup(v => v.Validate(It.IsAny<SavingsFormValues>()))
                            .Returns(new ValidationResult());

            // ensure DB path is never used
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
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
                wizardService.SaveStepDataAsync("duptest", 1, 2, json, 2));

            Assert.Contains("duplicate household-member IDs", ex.Message, StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }


        // ───── helper: map the path used in MemberData → fragment we expect in the error text
        private static string ExpectedFragment(string path) => path switch
        {
            "monthlyRent" => "Monthly Rent",
            "monthlyFuelCost" => "Monthly Fuel Cost",
            "customSubscriptions[0].fee" => "'Fee'",
            _ => throw new ArgumentOutOfRangeException(nameof(path))
        };
        public static IEnumerable<object[]> BadExpenseCases => new[]
        {
                new object[] { (decimal?)-10m, "monthlyRent"             }, // negative rent
                new object[] { (decimal?)-5m,  "monthlyFuelCost"         }, // negative fuel cost
                new object[] { (decimal?)null, "customSubscriptions[0].fee" } // missing fee
            };
        // ─────── expenditure validation with real validator ───────────────────────
        [Theory]
        [MemberData(nameof(BadExpenseCases))]
        public async Task SaveStepDataAsync_Step2_BadExpenditure_Throws(decimal? badNumber, string path)
        {
            var dto = new ExpenditureFormValues
            {
                Rent = new()
                {

                    HomeType = path == "monthlyRent" ? "rent" : "renter",
                    MonthlyRent = path == "monthlyRent" ? badNumber : 500m
                },
                Transport = new()
                {
                    MonthlyFuelCost = path == "monthlyFuelCost" ? badNumber : 200m
                },
                Subscriptions = new()
                {
                    CustomSubscriptions = new()
            {
                new()
                {
                    Name = "Netflix",
                    Fee  = path == "customSubscriptions[0].fee" ? badNumber : 99m
                }
            }
                }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // real validator for step 2
            var expenseValidator = new ExpenditureValidator();

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                CreatePassingValidatorMock<IncomeFormValues>().Object,
                expenseValidator,
                CreatePassingValidatorMock<SavingsFormValues>().Object,
                Mock.Of<ILogger<WizardServiceClass>>());

            // ─── Act & Assert ───────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync("expbad", 2, 1, json, 2));

            // look for the property fragment specific to this test case
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
            new() { Id = Guid.NewGuid().ToString(), Name = "Emergency", Amount = 0 } // ≤ 0
        }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // 1️⃣  real validator for Savings (expects Amount > 0)
            var savingsValidator = new SavingsValidator();          // <-- your real rule set

            // 2️⃣  pass-through mocks for Income & Expenditure
            var incomeValidator = CreatePassingValidatorMock<IncomeFormValues>().Object;
            var expenseValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;

            // 3️⃣  DB layer should never be hit on validation failure
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
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
                wizardService.SaveStepDataAsync("savbad", 3, 1, json, 2));

            Assert.Contains("'Amount' must be greater than '0'", ex.Message);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
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
                SavingHabit = "regular",                  // ← string, not enum
                MonthlySavings = 100m,
                SavingMethods = new() { "automatic" },      // ← list of strings

                Goals = new()
        {
            new() { Id = dup, Name = "A", Amount = 1 },
            new() { Id = dup, Name = "B", Amount = 1 }   // duplicate
        }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // real validator for step-3
            var savingsValidator = new SavingsValidator();

            // green-stub validators for the other steps
            var incomeValidator = CreatePassingValidatorMock<IncomeFormValues>().Object;
            var expenseValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;

            // SQL should never be hit on validation failure
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                    It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
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
                wizardService.SaveStepDataAsync("savdup", 3, 1, json, 2));

            Assert.Contains("duplicate goal IDs", ex.Message, StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }





    }

}
