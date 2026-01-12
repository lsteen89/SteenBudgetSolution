using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Common.Utilities;
using Backend.Domain.Enums;
using Dapper;
using MySqlConnector;

using IncomeDataDto = Backend.Application.DTO.Budget.Income.IncomeData;
using ExpenditureDataDto = Backend.Application.DTO.Budget.Expenditure.ExpenditureData;
using RentDto = Backend.Application.DTO.Budget.Expenditure.RentDto;
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
            Rent = new RentDto { MonthlyRent = 900m },
            Food = new FoodDto { FoodStoreExpenses = 200m, TakeoutExpenses = 50m },
            Transport = new TransportDto { MonthlyTransitCost = 600m },
            Clothing = new ClothingDto { MonthlyClothingCost = 100m },
            FixedExpenses = new FixedExpensesDto
            {
                Electricity = 300m,
                Insurance = 120m,
                Internet = 300m,
                Phone = 200m,
                UnionFees = 0m,
                CustomExpenses = new List<CustomExpenseDto>
                {
                    new() { Name = "Garbage fee", Cost = 75m },
                    new() { Name = "Parking", Cost = 250m },
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
