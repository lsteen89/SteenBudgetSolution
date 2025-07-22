using Backend.Application.DTO.Budget.Expenditure;
using Backend.Application.Models.Wizard;
using Backend.Common.Constants.Budget;
using Backend.Domain.Entities.Budget.Expenses;

namespace Backend.Application.Mapping.Budget
{
    public static class ExpenditureFlatteningMapper
    {

        public static Expense ToUnifiedExpense(this ExpenditureData dto, Guid budgetId)
        {
            var exp = new Expense { BudgetId = budgetId };

            if (dto.Rent is not null)
            {
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.Rent, dto.Rent.MonthlyRent);
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.RentExtraFees, dto.Rent.RentExtraFees);
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.MonthlyFee, dto.Rent.MonthlyFee);
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.BrfExtraFees, dto.Rent.BrfExtraFees);
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.MortgagePayment, dto.Rent.MortgagePayment);
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.HouseOtherCosts, dto.Rent.HouseotherCosts);
                exp.AddItem(ExpenseCategories.Rent, ExpenseItemLabels.OtherCosts, dto.Rent.OtherCosts);
            }

            if (dto.Food is not null)
            {
                exp.AddItem(ExpenseCategories.Food, ExpenseItemLabels.FoodStore, dto.Food.FoodStoreExpenses);
                exp.AddItem(ExpenseCategories.Food, ExpenseItemLabels.Takeout, dto.Food.TakeoutExpenses);
            }

            if (dto.Transport is not null)
            {
                exp.AddItem(ExpenseCategories.Transport, ExpenseItemLabels.Fuel, dto.Transport.MonthlyFuelCost);
                exp.AddItem(ExpenseCategories.Transport, ExpenseItemLabels.Insurance, dto.Transport.MonthlyInsuranceCost);
                exp.AddItem(ExpenseCategories.Transport, ExpenseItemLabels.TotalCarCost, dto.Transport.MonthlyTotalCarCost);
                exp.AddItem(ExpenseCategories.Transport, ExpenseItemLabels.Transit, dto.Transport.MonthlyTransitCost);
            }

            if (dto.Clothing is not null)
                exp.AddItem(ExpenseCategories.Clothing, ExpenseItemLabels.Clothing, dto.Clothing.MonthlyClothingCost);

            // FIXED EXPENSES
            if (dto.FixedExpenses is not null)
            {
                var fx = dto.FixedExpenses;
                exp.AddItem(ExpenseCategories.FixedExpense, ExpenseItemLabels.Electricity, fx.Electricity);
                exp.AddItem(ExpenseCategories.FixedExpense, ExpenseItemLabels.Insurance, fx.Insurance);
                exp.AddItem(ExpenseCategories.FixedExpense, ExpenseItemLabels.Internet, fx.Internet);
                exp.AddItem(ExpenseCategories.FixedExpense, ExpenseItemLabels.Phone, fx.Phone);
                exp.AddItem(ExpenseCategories.FixedExpense, ExpenseItemLabels.UnionFees, fx.UnionFees);

                foreach (var c in fx.CustomExpenses)
                    exp.AddItem(ExpenseCategories.FixedExpense, c.Name, c.Cost);
            }

            // SUBSCRIPTIONS (list-based)
            if (dto.Subscriptions is { Subscriptions.Count: > 0 })
            {
                foreach (var s in dto.Subscriptions.Subscriptions)
                {
                    exp.AddItem(ExpenseCategories.Subscription, s.Name, s.Cost);
                }
            }


            return exp;

        }
    }

}
