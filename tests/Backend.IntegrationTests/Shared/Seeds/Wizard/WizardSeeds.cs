using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Common.Utilities;
using Backend.Domain.Enums;
using Dapper;
using MySqlConnector;

using IncomeDataDto = Backend.Application.DTO.Budget.Income.IncomeData;
using ExpenditureDataDto = Backend.Application.DTO.Budget.Expenditure.ExpenditureData;
using HousingDto = Backend.Application.DTO.Budget.Expenditure.HousingDto;
using FoodDto = Backend.Application.DTO.Budget.Expenditure.FoodDto;
using TransportDto = Backend.Application.DTO.Budget.Expenditure.TransportDto;
using ClothingDto = Backend.Application.DTO.Budget.Expenditure.ClothingDto;
using FixedExpensesDto = Backend.Application.DTO.Budget.Expenditure.FixedExpensesDto;
using CustomExpenseDto = Backend.Application.DTO.Budget.Expenditure.CustomExpenseDto;
using Backend.Application.DTO.Budget.Expenditure;

namespace Backend.IntegrationTests.Shared.Wizard;

internal static class WizardSeeds
{
    private sealed record SeedSavingsGoal(string Name, decimal Amount);
    private sealed record SeedSavingsPayload(decimal MonthlySavings, SeedSavingsGoal[] Goals);
    private sealed record SeedDebtItem(
        string Name,
        string Type,
        decimal Balance,
        decimal Apr,
        decimal MonthlyFee,
        decimal? MinPayment,
        int? TermMonths);

    private sealed record SeedDebtsPayload(string RepaymentStrategy, SeedDebtItem[] Debts);

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    public static async Task SeedSessionAsync(string cs, Guid sessionId, Guid persoid)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.ExecuteAsync("""
            INSERT INTO WizardSession (WizardSessionId, Persoid, CreatedAt, UpdatedAt)
            VALUES (@sid, @pid, UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, pid = persoid });
    }

    public static async Task SeedIncomeAndExpenditureAsync(string cs, Guid sessionId)
    {
        var income = new IncomeDataDto
        {
            NetSalary = 30000m,
            SalaryFrequency = Frequency.Monthly,
            ShowHouseholdMembers = false,
            ShowSideIncome = false,
            SideHustles = new(),
            HouseholdMembers = new()
        };

        var exp = new ExpenditureDataDto
        {
            Housing = new HousingDto
            {
                HomeType = "rent",
                Payment = new HousingPaymentDto
                {
                    MonthlyRent = 12000m,
                    MonthlyFee = 500m,
                    ExtraFees = 0m,
                },
                RunningCosts = new HousingRunningCostsDto
                {
                    Electricity = 400m,
                    Heating = 300m,
                    Water = 150m,
                    Waste = 100m,
                    Other = 50m,
                }
            },
            Food = new FoodDto { FoodStoreExpenses = 200m, TakeoutExpenses = 50m },
            Transport = new TransportDto
            {
                FuelOrCharging = 1500m,
                CarInsurance = 800m,
                ParkingFee = 200m,
                OtherCarCosts = 100m,
                PublicTransit = 300m,
            },
            Clothing = new ClothingDto { MonthlyClothingCost = 100m },
            FixedExpenses = new FixedExpensesDto
            {
                Insurance = 600m,
                Internet = 400m,
                Phone = 300m,
                Gym = 250m,
                CustomExpenses = new List<CustomExpenseDto>
                {
                    new() { Name = "Yoga classes", Cost = 150m }
                }
            },
            Subscriptions = new SubscriptionsDto
            {
                CustomSubscriptions = new List<SubscriptionDto>
                {
                    new() { Name = "Extra Cloud", Cost = 29m }
                },
                Other = new Dictionary<string, JsonElement>
                {
                    ["netflix"] = JsonDocument.Parse("149").RootElement,
                    ["spotify"] = JsonDocument.Parse("119").RootElement,
                }
            }
        };

        // Ensure enums serialized as strings (camelCase) with your production helper.
        var incomeJson = JsonSerializer.Serialize(income, JsonHelper.Camel);

        // Expenditure doesn't have enums (mostly), normal camel is fine.
        var expJson = JsonSerializer.Serialize(exp, JsonOpts);

        await using var conn = new MySqlConnection(cs);
        await conn.ExecuteAsync("""
            INSERT INTO WizardStepData
                (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
            VALUES
                (@sid, 1, 0, @income, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
                (@sid, 2, 0, @exp,    1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, income = incomeJson, exp = expJson });
    }

    public static async Task SeedIncomeAndBrokenExpenditureAsync(string cs, Guid sessionId)
    {
        var incomeJson = """
            {"netSalary":30000,"salaryFrequency":"monthly","showHouseholdMembers":false,"showSideIncome":false,"sideHustles":[],"householdMembers":[]}
            """;

        await using var conn = new MySqlConnection(cs);
        await conn.ExecuteAsync("""
            INSERT INTO WizardStepData
                (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
            VALUES
                (@sid, 1, 0, @income, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
                (@sid, 2, 0, @expBroken, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, income = incomeJson, expBroken = "{ this is not valid json" });
    }
    public static async Task SeedSavingsAsync(string cs, Guid sessionId)
    {
        var savings = new SeedSavingsPayload(
            MonthlySavings: 2500m,
            Goals:
            [
                new SeedSavingsGoal("Emergency fund", 1000m),
                new SeedSavingsGoal("Investing", 1500m),
            ]);

        var json = JsonSerializer.Serialize(savings, JsonOpts);

        await using var conn = new MySqlConnection(cs);
        await conn.ExecuteAsync("""
            INSERT INTO WizardStepData
                (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
            VALUES
                (@sid, 3, 0, @json, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, json });
    }

    public static async Task SeedDebtsAsync(string cs, Guid sessionId)
    {
        var payload = new SeedDebtsPayload(
            RepaymentStrategy: "snowball",
            Debts:
            [
                new SeedDebtItem(
                    Name: "Credit Card",
                    Type: "revolving",
                    Balance: 10000m,
                    Apr: 18.0m,
                    MonthlyFee: 20m,
                    MinPayment: 300m,
                    TermMonths: null),

                new SeedDebtItem(
                    Name: "CSN",
                    Type: "installment",
                    Balance: 5000m,
                    Apr: 0.5m,
                    MonthlyFee: 10m,
                    MinPayment: null,
                    TermMonths: 24),
            ]);

        var json = JsonSerializer.Serialize(payload, JsonOpts);

        await using var conn = new MySqlConnection(cs);
        await conn.ExecuteAsync("""
            INSERT INTO WizardStepData
                (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
            VALUES
                (@sid, 4, 0, @json, 1, 'it', UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, json });
    }

}
