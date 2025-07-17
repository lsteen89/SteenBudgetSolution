using Backend.Application.DTO.Budget;
using Backend.Application.DTO.Budget.Expenditure;
using Backend.Domain.Entities.Budget.Expenditure;

namespace Backend.Application.Mapping
{
    public static class ExpenditureMapping
    {
        public static Expenditure ToDomain(this ExpenditureData dto)
        {
            return new Expenditure
            {
                Rent = dto.Rent?.ToDomain(),
                Food = dto.Food?.ToDomain(),
                Utilities = dto.Utilities?.ToDomain(),
                Transport = dto.Transport?.ToDomain(),
                Clothing = dto.Clothing?.ToDomain(),
                FixedExpenses = dto.FixedExpenses?.ToDomain(),
                Subscriptions = dto.Subscriptions?.ToDomain()
            };
        }

        public static Rent ToDomain(this RentDto dto)
        {
            return new Rent
            {
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

        public static Food ToDomain(this FoodDto dto)
        {
            return new Food
            {
                FoodStoreExpenses = dto.FoodStoreExpenses,
                TakeoutExpenses = dto.TakeoutExpenses
            };
        }

        public static Utilities ToDomain(this UtilitiesDto dto)
        {
            return new Utilities
            {
                Electricity = dto.Electricity,
                Water = dto.Water
            };
        }

        public static Transport ToDomain(this TransportDto dto)
        {
            return new Transport
            {
                MonthlyFuelCost = dto.MonthlyFuelCost,
                MonthlyInsuranceCost = dto.MonthlyInsuranceCost,
                MonthlyTotalCarCost = dto.MonthlyTotalCarCost,
                MonthlyTransitCost = dto.MonthlyTransitCost
            };
        }

        public static Clothing ToDomain(this ClothingDto dto)
        {
            return new Clothing
            {
                MonthlyClothingCost = dto.MonthlyClothingCost
            };
        }

        public static FixedExpenses ToDomain(this FixedExpensesDto dto)
        {
            var fixedExpenses = new FixedExpenses
            {
                Electricity = dto.Electricity,
                Insurance = dto.Insurance,
                Internet = dto.Internet,
                Phone = dto.Phone,
                UnionFees = dto.UnionFees
            };

            if (dto.CustomExpenses != null)
            {
                foreach (var customDto in dto.CustomExpenses)
                {
                    fixedExpenses.CustomExpenses.Add(customDto.ToDomain());
                }
            }

            return fixedExpenses;
        }

        public static CustomFixedExpense ToDomain(this CustomFixedExpenseDto dto)
        {
            return new CustomFixedExpense
            {
                Name = dto.Name,
                Cost = dto.Cost
            };
        }

        public static Subscriptions ToDomain(this SubscriptionsDto dto)
        {
            var subscriptions = new Subscriptions
            {
                Netflix = dto.Netflix,
                Spotify = dto.Spotify,
                HBOMax = dto.HBOMax,
                Viaplay = dto.Viaplay,
                DisneyPlus = dto.DisneyPlus
            };

            if (dto.CustomSubscriptions != null) 
            {
                foreach (var customDto in dto.CustomSubscriptions)
                {
                    subscriptions.CustomSubscriptions.Add(customDto.ToDomain()); 
                }
            }

            return subscriptions;
        }

        public static CustomSubscription ToDomain(this CustomSubscriptionDto dto)
        {
            return new CustomSubscription // Assuming your domain entity is named CustomSubscription
            {
                Name = dto.Name,
                Cost = dto.Cost
            };
        }
    }
}
