using Backend.Application.DTO.Budget.Expenditure;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Common.Constants.Budget;

namespace Backend.Application.Mappings.Budget
{
    public static class ExpenditureFlatteningMapper
    {
        // TODO: DELETE?
        public static Expense ToUnifiedExpense(this ExpenditureData dto, Guid budgetId)
        {
            var drafts = dto.ToExpenseItemDrafts();

            var exp = new Expense
            {
                BudgetId = budgetId,
                Items = drafts.Select(d => new ExpenseItem
                {
                    Id = Guid.Empty,
                    BudgetId = budgetId,
                    CategoryId = d.CategoryId,
                    Name = d.Name,
                    AmountMonthly = decimal.Round(d.AmountMonthly, 2, MidpointRounding.AwayFromZero),
                }).ToList()
            };

            return exp;
        }
        public static IReadOnlyList<ExpenseItemDraft> ToExpenseItemDrafts(this ExpenditureData dto)
        {
            var items = new List<ExpenseItemDraft>();

            void Add(Guid categoryId, string name, decimal? amount)
            {
                if (amount is null || amount <= 0) return;
                if (string.IsNullOrWhiteSpace(name)) return;

                items.Add(new ExpenseItemDraft(
                    CategoryId: categoryId,
                    Name: name.Trim(),
                    AmountMonthly: amount.Value
                ));
            }

            // HOUSING
            if (dto.Housing is not null)
            {
                var p = dto.Housing.Payment;
                var r = dto.Housing.RunningCosts;

                Add(ExpenseCategories.Housing, ExpenseItemLabels.HousingMonthlyRent, p?.MonthlyRent);
                Add(ExpenseCategories.Housing, ExpenseItemLabels.HousingMonthlyFee, p?.MonthlyFee);
                Add(ExpenseCategories.Housing, ExpenseItemLabels.HousingExtraFees, p?.ExtraFees);

                Add(ExpenseCategories.Housing, ExpenseItemLabels.Electricity, r?.Electricity);
                Add(ExpenseCategories.Housing, ExpenseItemLabels.Heating, r?.Heating);
                Add(ExpenseCategories.Housing, ExpenseItemLabels.Water, r?.Water);
                Add(ExpenseCategories.Housing, ExpenseItemLabels.Waste, r?.Waste);
                Add(ExpenseCategories.Housing, ExpenseItemLabels.OtherHomeRunningCosts, r?.Other);
            }

            // FOOD
            if (dto.Food is not null)
            {
                Add(ExpenseCategories.Food, ExpenseItemLabels.FoodStore, dto.Food.FoodStoreExpenses);
                Add(ExpenseCategories.Food, ExpenseItemLabels.Takeout, dto.Food.TakeoutExpenses);
            }

            // TRANSPORT
            if (dto.Transport is not null)
            {
                Add(ExpenseCategories.Transport, ExpenseItemLabels.FuelOrCharging, dto.Transport.FuelOrCharging);
                Add(ExpenseCategories.Transport, ExpenseItemLabels.CarInsurance, dto.Transport.CarInsurance);
                Add(ExpenseCategories.Transport, ExpenseItemLabels.ParkingFee, dto.Transport.ParkingFee);
                Add(ExpenseCategories.Transport, ExpenseItemLabels.OtherCarCosts, dto.Transport.OtherCarCosts);
                Add(ExpenseCategories.Transport, ExpenseItemLabels.PublicTransit, dto.Transport.PublicTransit);
            }

            // CLOTHING
            if (dto.Clothing is not null)
                Add(ExpenseCategories.Clothing, ExpenseItemLabels.Clothing, dto.Clothing.MonthlyClothingCost);

            // FIXED
            if (dto.FixedExpenses is not null)
            {
                var fx = dto.FixedExpenses;

                Add(ExpenseCategories.FixedExpense, ExpenseItemLabels.Insurance, fx.Insurance);
                Add(ExpenseCategories.FixedExpense, ExpenseItemLabels.Internet, fx.Internet);
                Add(ExpenseCategories.FixedExpense, ExpenseItemLabels.Phone, fx.Phone);
                Add(ExpenseCategories.FixedExpense, ExpenseItemLabels.Gym, fx.Gym);

                if (fx.CustomExpenses is not null)
                {
                    foreach (var c in fx.CustomExpenses)
                    {
                        if (c is null) continue;
                        Add(ExpenseCategories.FixedExpense, c.Name, c.Cost);
                    }
                }
            }

            // SUBSCRIPTIONS
            if (dto.Subscriptions is not null)
            {
                foreach (var s in dto.Subscriptions.Flatten())
                    Add(ExpenseCategories.Subscription, s.Name, s.Cost);
            }

            return items;
        }

    }
}