using Backend.Application.DTO.Budget.Expenditure;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Entities.Budget.Expenditure.Archive;

namespace Backend.Application.Mapping.Budget.Archive
{
    public static class ExpenditureMapping
    {
        public static Expenditure ToDomain(this ExpenditureData dto, Guid budgetId)
        {
            return new Expenditure
            {
                Rent = dto.Rent?.ToDomain(budgetId),
                Food = dto.Food?.ToDomain(budgetId),
                Transport = dto.Transport?.ToDomain(budgetId),
                Clothing = dto.Clothing?.ToDomain(budgetId),
                FixedExpenses = dto.FixedExpenses?.ToDomain(budgetId),
                Subscriptions = dto.Subscriptions?.ToDomain(budgetId)
            };
        }

        public static Rent ToDomain(this RentDto dto, Guid budgetId)
        {
            return new Rent
            {
                Id = Guid.Empty,
                BudgetId = Guid.Empty, // This will be set later in the processor
                HomeType = dto.HomeType,
                MonthlyRent = dto.MonthlyRent,
                RentExtraFees = dto.RentExtraFees,
                MonthlyFee = dto.MonthlyFee,
                BrfExtraFees = dto.BrfExtraFees,
                MortgagePayment = dto.MortgagePayment,
                HouseotherCosts = dto.HouseotherCosts,
                OtherCosts = dto.OtherCosts
            };
        }

        public static Food ToDomain(this FoodDto dto, Guid budgetId)
        {
            return new Food
            {
                Id = Guid.Empty,
                BudgetId = budgetId,
                FoodStoreExpenses = dto.FoodStoreExpenses,
                TakeoutExpenses = dto.TakeoutExpenses
            };
        }

        public static Transport ToDomain(this TransportDto dto, Guid budgetId)
        {
            return new Transport
            {
                Id = Guid.Empty,
                BudgetId = budgetId,
                MonthlyFuelCost = dto.MonthlyFuelCost,
                MonthlyInsuranceCost = dto.MonthlyInsuranceCost,
                MonthlyTotalCarCost = dto.MonthlyTotalCarCost,
                MonthlyTransitCost = dto.MonthlyTransitCost
            };
        }

        public static Clothing ToDomain(this ClothingDto dto, Guid budgetId)
        {
            return new Clothing
            {
                Id = Guid.Empty,
                BudgetId = budgetId,
                MonthlyClothingCost = dto.MonthlyClothingCost
            };
        }

        private static FixedExpenses ToDomain(this FixedExpensesDto dto, Guid budgetId)
        {
            var fixedExp = new FixedExpenses
            {
                Id = Guid.Empty,
                BudgetId = budgetId,
                Electricity = dto.Electricity,
                Insurance = dto.Insurance,
                Internet = dto.Internet,
                Phone = dto.Phone,
                UnionFees = dto.UnionFees
            };

            foreach (var c in dto.CustomExpenses)
                fixedExp.CustomExpenses.Add(new CustomExpense
                {
                    Id = Guid.Empty,
                    Name = c.Name,
                    Cost = c.Cost
                });

            return fixedExp;
        }
        private static Subscriptions ToDomain(this SubscriptionsDto dto, Guid budgetId)
        {
            var subs = new Subscriptions
            {
                Id = Guid.Empty,
                BudgetId = budgetId
            };

            foreach (var s in dto.Subscriptions)
                subs.Items.Add(new SubscriptionItem
                {
                    Id = Guid.Empty,
                    Name = s.Name,
                    Cost = s.Cost
                });

            return subs;
        }
    }
}
