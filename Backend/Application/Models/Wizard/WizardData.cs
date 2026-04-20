using System.Text.Json.Serialization;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Enums;

namespace Backend.Application.Models.Wizard;

/// <summary>
/// Root payload exchanged with the React wizard.
/// this is ONLY used for the initial data exchange.
/// NEVER within the rest of the application. (Finalize wizard step converts it to domain models(DTO, entities ETC))
/// </summary>
public sealed class WizardData
{
    [JsonPropertyName("income")]
    public IncomeFormValues? Income { get; set; }

    [JsonPropertyName("expenditure")]
    public ExpenditureFormValues? Expenditure { get; set; }

    [JsonPropertyName("savings")]
    public SavingsFormValues? Savings { get; set; }

    [JsonPropertyName("debts")]
    public DebtsFormValues? Debts { get; set; }
}

/* ---------- Income ---------- */
#region income
public sealed record IncomeFormValues
{
    [JsonPropertyName("netSalary")]
    public decimal? NetSalary { get; init; }

    [JsonPropertyName("salaryFrequency")]
    public Frequency SalaryFrequency { get; init; }

    [JsonPropertyName("incomePaymentDayType")]
    public string? IncomePaymentDayType { get; init; }

    [JsonPropertyName("incomePaymentDay")]
    public int? IncomePaymentDay { get; init; }

    [JsonPropertyName("householdMembers")]
    public List<IncomeItem> HouseholdMembers { get; init; } = new();

    [JsonPropertyName("sideHustles")]
    public List<IncomeItem> SideHustles { get; init; } = new();
}

public sealed record IncomeItem
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("income")]
    public decimal? Income { get; init; }

    [JsonPropertyName("frequency")]
    public Frequency? Frequency { get; init; }
}
#endregion
/* ---------- Expenditure ---------- */
#region expenditure
public sealed record ExpenditureFormValues(
    [property: JsonPropertyName("housing")] Housing? Housing,
    [property: JsonPropertyName("food")] Food? Food,
    [property: JsonPropertyName("fixedExpenses")] FixedExpensesSubForm? FixedExpenses,
    [property: JsonPropertyName("transport")] Transport? Transport,
    [property: JsonPropertyName("clothing")] Clothing? Clothing,
    [property: JsonPropertyName("subscriptions")] SubscriptionsSubForm? Subscriptions
);

/* ---- expenditure sub-objects ---- */

public sealed class Housing
{
    [JsonPropertyName("homeType")]
    public string? HomeType { get; init; } // "rent" | "brf" | "house" | "free"

    [JsonPropertyName("payment")]
    public HousingPayment? Payment { get; init; }

    [JsonPropertyName("runningCosts")]
    public HousingRunningCosts? RunningCosts { get; init; }
}

public sealed class HousingPayment
{
    [JsonPropertyName("monthlyRent")]
    public decimal? MonthlyRent { get; init; }

    [JsonPropertyName("monthlyFee")]
    public decimal? MonthlyFee { get; init; }

    [JsonPropertyName("extraFees")]
    public decimal? ExtraFees { get; init; }
}

public sealed class HousingRunningCosts
{
    [JsonPropertyName("electricity")]
    public decimal? Electricity { get; init; }

    [JsonPropertyName("heating")]
    public decimal? Heating { get; init; }

    [JsonPropertyName("water")]
    public decimal? Water { get; init; }

    [JsonPropertyName("waste")]
    public decimal? Waste { get; init; }

    [JsonPropertyName("other")]
    public decimal? Other { get; init; }
}

public sealed class Food
{
    [JsonPropertyName("foodStoreExpenses")]
    public decimal? FoodStoreExpenses { get; init; }

    [JsonPropertyName("takeoutExpenses")]
    public decimal? TakeoutExpenses { get; init; }
}

public sealed class Transport
{
    [JsonPropertyName("fuelOrCharging")]
    public decimal? FuelOrCharging { get; init; }

    [JsonPropertyName("carInsurance")]
    public decimal? CarInsurance { get; init; }

    [JsonPropertyName("parkingFee")]
    public decimal? ParkingFee { get; init; }

    [JsonPropertyName("otherCarCosts")]
    public decimal? OtherCarCosts { get; init; }

    [JsonPropertyName("publicTransit")]
    public decimal? PublicTransit { get; init; }
}

public sealed class Clothing
{
    [JsonPropertyName("monthlyClothingCost")]
    public decimal? MonthlyClothingCost { get; init; }
}

public sealed record FixedExpensesSubForm(
    [property: JsonPropertyName("electricity")] decimal? Electricity,
    [property: JsonPropertyName("insurance")] decimal? Insurance,
    [property: JsonPropertyName("internet")] decimal? Internet,
    [property: JsonPropertyName("phone")] decimal? Phone,
    [property: JsonPropertyName("gym")] decimal? Gym,
    [property: JsonPropertyName("customExpenses")] List<FixedExpenseItem>? CustomExpenses
);

public sealed record FixedExpenseItem(
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("cost")] decimal? Cost
);


public sealed record SubscriptionsSubForm
{
    [JsonPropertyName("netflix")]
    public decimal? Netflix { get; init; }

    [JsonPropertyName("spotify")]
    public decimal? Spotify { get; init; }

    [JsonPropertyName("hbomax")]
    public decimal? HBOMax { get; init; }

    [JsonPropertyName("viaplay")]
    public decimal? Viaplay { get; init; }

    [JsonPropertyName("disneyPlus")]
    public decimal? DisneyPlus { get; init; }

    [JsonPropertyName("customSubscriptions")]
    public List<SubscriptionItem>? CustomSubscriptions { get; init; }
}

public sealed record SubscriptionItem
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("cost")]
    public decimal? Cost { get; init; }
}

#endregion
/* ---------- Savings ---------- */
#region savings
public sealed class SavingsFormValues
{
    [JsonPropertyName("intro")]
    public SavingsIntro? Intro { get; set; }

    [JsonPropertyName("habits")]
    public SavingHabits? Habits { get; set; }

    [JsonPropertyName("goals")]
    public List<SavingsGoal>? Goals { get; set; }
}

public sealed class SavingsIntro
{
    [JsonPropertyName("savingHabit")]
    public string? SavingHabit { get; set; }
}

public sealed class SavingHabits
{
    [JsonPropertyName("monthlySavings")]
    public decimal? MonthlySavings { get; set; }

    [JsonPropertyName("savingMethods")]
    public List<SavingMethod>? SavingMethods { get; set; }
}

public enum SavingMethod
{
    Auto,

    Manual,

    Invest,

    PreferNot,
}

#endregion
/* ---------- Debts ---------- */
#region debts

public sealed class DebtsFormValues
{
    [JsonPropertyName("intro")]
    public DebtsIntro? Intro { get; set; }

    [JsonPropertyName("summary")]
    public DebtsSummary? Summary { get; set; }

    [JsonPropertyName("debts")]
    public List<DebtItem>? Debts { get; set; }
}

public sealed class DebtsIntro
{
    [JsonPropertyName("hasDebts")]
    public bool? HasDebts { get; set; }
}

public sealed class DebtsSummary
{
    [JsonPropertyName("repaymentStrategy")]
    public RepaymentStrategy RepaymentStrategy { get; set; } = RepaymentStrategy.Unknown;
}

public sealed class DebtItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;


    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty; // "installment", "revolving", "private", or "bank_loan"

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("balance")]
    public decimal? Balance { get; set; }

    [JsonPropertyName("apr")]
    public decimal? Apr { get; set; }

    // --- ADDED ---
    [JsonPropertyName("monthlyFee")]
    public decimal? MonthlyFee { get; set; }

    [JsonPropertyName("minPayment")]
    public decimal? MinPayment { get; set; }

    [JsonPropertyName("termMonths")]
    public int? TermMonths { get; set; }
}

#endregion
