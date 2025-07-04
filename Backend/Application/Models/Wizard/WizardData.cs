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

    [JsonPropertyName("debts")]
    public DebtsFormValues? Debts { get; set; }
}

/* ---------- Income ---------- */
#region income
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
#endregion
/* ---------- Expenditure ---------- */
#region expenditure
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
    public FixedExpensesSubForm? FixedExpenses { get; init; }

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

public sealed class FixedExpensesSubForm
{
    [JsonPropertyName("electricity")]
    public decimal? Electricity { get; init; }

    [JsonPropertyName("insurance")]
    public decimal? Insurance { get; init; }

    [JsonPropertyName("internet")]
    public decimal? Internet { get; init; }

    [JsonPropertyName("phone")]
    public decimal? Phone { get; init; }

    [JsonPropertyName("unionFees")]
    public decimal? UnionFees { get; init; }

    [JsonPropertyName("customExpenses")]
    public List<FixedExpenseItem>? CustomExpenses { get; init; }
}

public sealed class FixedExpenseItem
{
    [JsonPropertyName("id")]
    public string? Id { get; init; } // Match frontend's optional 'id'

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    // Renamed 'Amount' to 'Cost' to perfectly align with the frontend yup schema
    [JsonPropertyName("cost")]
    public decimal? Cost { get; init; }
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
    public List<string>? SavingMethods { get; set; }
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
    public string? RepaymentStrategy { get; set; }
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
