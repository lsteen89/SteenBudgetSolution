
export const VALIDATION_FIELD_MAP: Record<string, string> = {
    // Step 4 (Debts)
    Debts: 'intro.hasDebts',                  // gatekeeper
    DebtItem: 'debts',                        // generic list error (use array-level)
    DebtType: 'debts[].type',
    DebtName: 'debts[].name',
    DebtBalance: 'debts[].balance',
    DebtApr: 'debts[].apr',
    DebtMonthlyFee: 'debts[].monthlyFee',
    DebtMinPayment: 'debts[].minPayment',
    DebtTermMonths: 'debts[].termMonths',
    RepaymentStrategy: 'summary.repaymentStrategy',

    // Step 2 (Expenditure) – examples, extend as BE emits labels
    RentMonthly: 'rent.monthlyRent',
    FoodStore: 'food.foodStoreExpenses',
    Takeout: 'food.takeoutExpenses',
    Electricity: 'utilities.electricity',
    Water: 'utilities.water',
    TransportFuel: 'transport.monthlyFuelCost',
    TransportInsurance: 'transport.monthlyInsuranceCost',
    Transit: 'transport.monthlyTransitCost',
    Clothing: 'clothing.monthlyClothingCost',
    FixedExpenses: 'fixedExpenses',           // section-level
    Subscriptions: 'subscriptions',           // section-level

    // Step 1 (Income)
    NetSalary: 'netSalary',
    SalaryFrequency: 'salaryFrequency',
    HouseholdMemberName: 'householdMembers[].name',
    HouseholdMemberIncome: 'householdMembers[].income',
    SideHustleName: 'sideHustles[].name',
    SideHustleIncome: 'sideHustles[].income',

    // Step 3 (Savings)
    SavingHabit: 'intro.savingHabit',
    MonthlySavings: 'habits.monthlySavings',
    SavingMethods: 'habits.savingMethods',
    GoalName: 'goals[].name',
    GoalTargetAmount: 'goals[].targetAmount',
    GoalTargetDate: 'goals[].targetDate',
};
