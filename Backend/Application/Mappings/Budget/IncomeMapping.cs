using Backend.Application.DTO.Budget.Income;
using Backend.Domain.Common;
using Backend.Domain.Entities.Budget;
using Backend.Domain.Entities.Budget.Income;

namespace Backend.Application.Mappings.Budget
{
    public static class IncomeMapping
    {
        public static Income ToDomain(this IncomeData src, Guid budgetId)
        {
            var income = new Income
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                SalaryFrequency = src.SalaryFrequency,
                NetSalaryMonthly = FrequencyConversion.ToMonthly(src.NetSalary, src.SalaryFrequency)
            };

            if (src.SideHustles?.Count > 0)
            {
                foreach (var sh in src.SideHustles)
                {
                    income.SideHustles.Add(new SideHustle
                    {
                        Id = Guid.Empty, // regen later
                        IncomeId = income.Id,
                        Name = sh.Name,
                        Frequency = sh.Frequency,
                        IncomeMonthly = FrequencyConversion.ToMonthly(sh.Income, sh.Frequency)
                    });
                }
            }

            if (src.HouseholdMembers?.Count > 0)
            {
                foreach (var hm in src.HouseholdMembers)
                {
                    income.HouseholdMembers.Add(new HouseholdMember
                    {
                        Id = Guid.Empty, // regen later
                        IncomeId = income.Id,
                        Name = hm.Name,
                        Frequency = hm.Frequency,
                        IncomeMonthly = FrequencyConversion.ToMonthly(hm.Income, hm.Frequency)
                    });
                }
            }

            return income;
        }
    }
}
