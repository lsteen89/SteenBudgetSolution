using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Backend.Contracts.Wizard;

/// <summary>
/// Root payload exchanged with the React wizard.
/// </summary>
public sealed class WizardData
{
    [JsonPropertyName("income")]
    public IncomeFormValues? Income { get; set; }

    [JsonPropertyName("expenditure")]
    public ExpenditureFormValues? Expenditure { get; set; }

    [JsonPropertyName("savings")]
    public SavingsFormValues? Savings { get; set; }
}

/* ---------- Income ---------- */

public sealed class IncomeFormValues
{
    [JsonPropertyName("netSalary")]
    public decimal? NetSalary { get; init; }

    [JsonPropertyName("showSideIncome")]
    public bool? ShowSideIncome { get; init; }              // ❗️bool? (was bool)

    [JsonPropertyName("showHouseholdMembers")]
    public bool? ShowHouseholdMembers { get; init; }        // ❗️bool? (was bool)

    [JsonPropertyName("salaryFrequency")]
    public Frequency SalaryFrequency { get; init; }

    [JsonPropertyName("householdMembers")]
    public List<HouseholdMember>? HouseholdMembers { get; init; }   // ❗️nullable, no = new()

    [JsonPropertyName("sideHustles")]
    public List<SideHustle>? SideHustles { get; init; }             // ❗️nullable, no = new()

    [JsonPropertyName("yearlySalary")]
    public decimal? YearlySalary { get; init; }
}

public sealed class HouseholdMember
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("income")]
    public decimal? Income { get; init; }

    [JsonPropertyName("frequency")]
    public Frequency Frequency { get; init; }

    [JsonPropertyName("yearlyIncome")]
    public decimal? YearlyIncome { get; init; }
}

public sealed class SideHustle
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("income")]
    public decimal? Income { get; init; }

    [JsonPropertyName("frequency")]
    public Frequency Frequency { get; init; }

    [JsonPropertyName("yearlyIncome")]
    public decimal? YearlyIncome { get; init; }
}

/* ---------- Expenditure ---------- */

public sealed class ExpenditureFormValues
{
    [JsonPropertyName("rent")]
    public Rent? Rent { get; init; }                 // ❗️nullable, no = new()

    [JsonPropertyName("food")]
    public Food? Food { get; init; }                 // ❗️nullable, no = new()

    [JsonPropertyName("utilities")]
    public Utilities? Utilities { get; init; }       // ❗️nullable, no = new()

    // Optional sub-forms – keep as nullable
    [JsonPropertyName("fixedExpenses")]
    public FixedExpenseItem? FixedExpenses { get; init; }

    [JsonPropertyName("transport")]
    public Transport? Transport { get; init; }       // ❗️nullable, no = new()

    [JsonPropertyName("clothing")]
    public Clothing? Clothing { get; init; }         // ❗️nullable, no = new()

    [JsonPropertyName("subscriptions")]
    public SubscriptionsSubForm? Subscriptions { get; init; }
}

/* ---- expenditure sub-objects ---- */

public sealed class Rent
{
    [JsonPropertyName("homeType")]
    public string? HomeType { get; init; }

    [JsonPropertyName("monthlyRent")]
    public decimal? MonthlyRent { get; init; }       // ❗️decimal?

    [JsonPropertyName("rentExtraFees")]
    public decimal? RentExtraFees { get; init; }

    [JsonPropertyName("monthlyFee")]
    public decimal? MonthlyFee { get; init; }        // ❗️decimal?

    [JsonPropertyName("brfExtraFees")]
    public decimal? BrfExtraFees { get; init; }

    [JsonPropertyName("mortgagePayment")]
    public decimal? MortgagePayment { get; init; }   // ❗️decimal?

    [JsonPropertyName("houseotherCosts")]
    public decimal? HouseotherCosts { get; init; }

    [JsonPropertyName("otherCosts")]
    public decimal? OtherCosts { get; init; }
}

public sealed class Food
{
    [JsonPropertyName("foodStoreExpenses")]
    public decimal? FoodStoreExpenses { get; init; }

    [JsonPropertyName("takeoutExpenses")]
    public decimal? TakeoutExpenses { get; init; }
}

public sealed class Utilities
{
    [JsonPropertyName("electricity")]
    public decimal? Electricity { get; init; }

    [JsonPropertyName("water")]
    public decimal? Water { get; init; }
}

public sealed class Transport
{
    [JsonPropertyName("monthlyFuelCost")]
    public decimal? MonthlyFuelCost { get; init; }

    [JsonPropertyName("monthlyInsuranceCost")]
    public decimal? MonthlyInsuranceCost { get; init; }

    [JsonPropertyName("monthlyTotalCarCost")]
    public decimal? MonthlyTotalCarCost { get; init; }

    [JsonPropertyName("monthlyTransitCost")]
    public decimal? MonthlyTransitCost { get; init; }
}

public sealed class Clothing
{
    [JsonPropertyName("monthlyClothingCost")]
    public decimal? MonthlyClothingCost { get; init; }
}

public sealed class FixedExpenseItem
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal? Amount { get; init; }
}

public sealed class SubscriptionsSubForm
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
    public List<SubscriptionItem?>? CustomSubscriptions { get; init; }  // ❗️nullable, no = new()
}

public sealed class SubscriptionItem
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("fee")]
    public decimal? Fee { get; init; }
}

/* ---------- Savings ---------- */

public sealed class SavingsFormValues
{
    [JsonPropertyName("savingHabit")]
    public string SavingHabit { get; init; } = string.Empty;

    [JsonPropertyName("monthlySavings")]
    public decimal? MonthlySavings { get; init; }

    [JsonPropertyName("savingMethods")]
    public List<string> SavingMethods { get; init; } = new();

    [JsonPropertyName("goals")]
    public List<SavingsGoal> Goals { get; init; } = new();
}

public sealed class SavingsGoal
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal? Amount { get; init; }
}

/* ---------- Shared ---------- */

public enum Frequency
{
    Unknown = 0,
    Weekly,
    BiWeekly,
    Monthly,
    Quarterly,
    Yearly,
    Other
}
