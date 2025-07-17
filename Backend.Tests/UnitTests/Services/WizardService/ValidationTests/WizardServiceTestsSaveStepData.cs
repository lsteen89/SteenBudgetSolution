using Backend.Application.Interfaces.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Application.Validators.WizardValidation;
using Backend.Domain.Enums;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Tests.UnitTests.Helpers;
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
    public interface IMyService
    {
        // The 'retries' parameter is optional.
        bool DoWork(string task, int retries = 3);
    }
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
                ShowSideIncome = false,
                SideHustles = new()
        {
            new() { Name = "Dev-blog", Income = 1_000m, Frequency = Frequency.Monthly }
        }
            };
            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder()
                              .WithIncomeValidator(new IncomeValidator());      // only real rule needed

            var sqlMock = builder.SqlExecutorMock;   // expose for verification
            var wizard = builder.Build();

            // ─── Act & Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2));

            Assert.Contains("side hustles should not be provided", ex.Message,
                            StringComparison.OrdinalIgnoreCase);

            sqlMock.Verify(e => e.UpsertStepDataAsync(
                               It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                               It.IsAny<string>(), It.IsAny<int>(),
                               It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                           Times.Never);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step1_DuplicateHouseholdMemberIds_Throws()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dupId = Guid.NewGuid().ToString();

            var dto = new IncomeFormValues
            {
                ShowHouseholdMembers = true,
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new()
        {
            new() { Id = dupId, Name = "A", Income = 1m, Frequency = Frequency.Monthly },
            new() { Id = dupId, Name = "B", Income = 1m, Frequency = Frequency.Monthly } // duplicate
        }
            };
            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder()
                            .WithIncomeValidator(new IncomeValidator());  // real rule set

            var sqlMock = builder.SqlExecutorMock; // same mock injected into service
            var wizard = builder.Build();

            // ─── Act / Assert ───────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2));

            Assert.Contains("duplicate household-member IDs", ex.Message,
                            StringComparison.OrdinalIgnoreCase);

            sqlMock.Verify(e => e.UpsertStepDataAsync(
                               It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                               It.IsAny<string>(), It.IsAny<int>(),
                               It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                           Times.Never);
        }



        // ─── helper: expected‑fragment mapper (unchanged) ─────────────────────────────
        private static string ExpectedFragment(string path) => path switch
        {
            "monthlyRent" => "Monthly Rent",
            "monthlyFuelCost" => "Monthly Fuel Cost",
            "customSubscriptions[0].cost" => "'cost'",
            _ => throw new ArgumentOutOfRangeException(nameof(path))
        };

        // ─── test‑case data: Func<ExpenditureFormValues> + expected text ──────────────
        public static IEnumerable<object[]> BadExpenseCases =>
            new[]
            {
                new object[]
                {
                    (Func<ExpenditureFormValues>)(() => new ExpenditureFormValues
                    {
                        Rent = new Rent
                        {
                            HomeType    = "rent",      // ← must match validator’s condition
                            MonthlyRent = -10m         // invalid
                        },
                        Transport = new Transport
                        {
                            MonthlyFuelCost = 200m
                        },
                        Subscriptions = new SubscriptionsSubForm
                        {
                            CustomSubscriptions = new List<SubscriptionItem?>
                            {
                                new() { Name = "Netflix", Cost = 99m }
                            }
                        }
                    }),
                    ExpectedFragment("monthlyRent")
                },
                new object[]
                {
                    (Func<ExpenditureFormValues>)(() => new ExpenditureFormValues
                    {
                        Rent = new Rent { HomeType = "renter", MonthlyRent = 500m },
                        Transport = new Transport
                        {
                            MonthlyFuelCost = -5m           // invalid
                        },
                        Subscriptions = new SubscriptionsSubForm
                        {
                            CustomSubscriptions = new List<SubscriptionItem?>
                            {
                                new() { Name = "Netflix", Cost = 99m }
                            }
                        }
                    }),
                    ExpectedFragment("monthlyFuelCost")
                },
                new object[]
                {
                    (Func<ExpenditureFormValues>)(() => new ExpenditureFormValues
                    {
                        Rent = new Rent { HomeType = "renter", MonthlyRent = 500m },
                        Transport = new Transport { MonthlyFuelCost = 200m },
                        Subscriptions = new SubscriptionsSubForm
                        {
                            CustomSubscriptions = new List<SubscriptionItem?>
                            {
                                new() { Name = "Netflix", Cost = null } // invalid
                            }
                        }
                    }),
                    ExpectedFragment("customSubscriptions[0].cost")
                }
            };

        // ─── theory ──────────────────────────────────────────────────────────────────
        [Theory]
        [MemberData(nameof(BadExpenseCases))]
        public async Task SaveStepDataAsync_Step2_BadExpenditure_Throws(
            Func<ExpenditureFormValues> dtoFactory,
            string expectedFragment)
        {
            // Arrange
            var dto = dtoFactory();                                 // get invalid DTO
            var json = JsonSerializer.Serialize(dto, Camel);

            var wizard = new WizardServiceBuilder()
                            .WithExpenditureValidator(new ExpenditureValidator()) // real validator
                            .Build();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizard.SaveStepDataAsync(Guid.NewGuid(), 2, 1, json, 2));

            Assert.Contains(expectedFragment, ex.Message, StringComparison.OrdinalIgnoreCase);
        }



        [Fact]
        public async Task SaveStepDataAsync_Step3_NegativeOrZeroGoal_Throws()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────

            // 1. Create the specific DTO with the invalid data. This is unique to our test.
            var dto = new SavingsFormValues
            {
                Goals = new() { new() { Id = Guid.NewGuid().ToString(), Name = "Emergency", TargetAmount = 0 } }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // 2. Use the Oracle to build the service. We command it to use our one REAL validator.
            var builder = new WizardServiceBuilder()
                .WithSavingsValidator(new SavingsValidator()); // The only unique piece of setup!

            var wizardService = builder.Build();

            // ─── Act & Assert ──────────────────────────────────────────────────────

            // This part was already perfect and remains unchanged.
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(Guid.NewGuid(), 3, 1, json, 2));

            Assert.Contains("Goal amount must be greater than 0", ex.Message);

            // We use the builder's exposed mock for our verification.
            var mock = new Mock<IMyService>();

            // Explicitly provide a value for ALL parameters inside the expression.
            mock.Setup(s => s.DoWork("some-task", It.IsAny<int>()))
                .Returns(true);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step3_DuplicateGoalIds_Throws()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────

            // 1. Create the specific DTO with the invalid data. This is the heart of our test.
            string dupId = Guid.NewGuid().ToString();
            var dto = new SavingsFormValues
            {
                Intro = new() { SavingHabit = "regular" },
                Habits = new() { MonthlySavings = 100m, SavingMethods = new() { "automatic" } },
                Goals = new()
                {
                    new() { Id = dupId, Name = "A", TargetAmount = 1000m, TargetDate = DateTime.UtcNow.AddYears(1) },
                    new() { Id = dupId, Name = "B", TargetAmount = 2000m, TargetDate = DateTime.UtcNow.AddYears(2) }
                }
            };
            string json = JsonSerializer.Serialize(dto, Camel);

            // 2. Use the Oracle to forge the service, telling it only what needs to change.
            var builder = new WizardServiceBuilder()
                .WithSavingsValidator(new SavingsValidator()); // We need the REAL savings validator.

            var wizardService = builder.Build();

            // ─── Act & Assert ──────────────────────────────────────────────────────

            // This part remains the same, for its purpose was already true.
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(Guid.NewGuid(), 3, 1, json, 2));

            Assert.Contains("duplicate goal IDs", ex.Message, StringComparison.OrdinalIgnoreCase);

            // We verify against the builder's own mock.
            builder.SqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                    It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                    It.IsAny<string>(), It.IsAny<int>(),
                    It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }
        private static ExpenditureFormValues CreateValidDto() => new()
        {
            // Housing expenses
            Rent = new Backend.Application.Models.Wizard.Rent
            {
                HomeType = "rent",
                MonthlyRent = 7000m
            },

            // Food expenses
            Food = new Backend.Application.Models.Wizard.Food
            {
                FoodStoreExpenses = 3000m,
                TakeoutExpenses = 800m
            },

            // Transportation expenses
            Transport = new Backend.Application.Models.Wizard.Transport
            {
                MonthlyFuelCost = 1500m,
                MonthlyTransitCost = 700m
            },

            // Personal spending
            Clothing = new Backend.Application.Models.Wizard.Clothing
            {
                MonthlyClothingCost = 500m
            },

            // Fixed monthly bills
            FixedExpenses = new Backend.Application.Models.Wizard.FixedExpensesSubForm
            {
                Electricity = 600m,
                Insurance = 150m,
                Internet = 500m,
                Phone = 300m,
                UnionFees = 400m,
                CustomExpenses = new List<Backend.Application.Models.Wizard.FixedExpenseItem>
                {
                    new() { Name = "Gym Membership", Cost = 550m }
                }
            },

            // Subscriptions
            Subscriptions = new Backend.Application.Models.Wizard.SubscriptionsSubForm
            {
                Netflix = 109m,
                Spotify = 109m,
                HBOMax = 99m,
                Viaplay = 129m,
                DisneyPlus = 89m,
                CustomSubscriptions = new List<Backend.Application.Models.Wizard.SubscriptionItem>
                {
                    new() { Name = "Cloud Storage", Cost = 25m }
                }
            }
        };
    }
}
