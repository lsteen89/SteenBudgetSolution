using Backend.Application.DTO.Budget;
using Backend.Domain.Entities.Budget;

namespace Backend.Application.Mapping
{
    public static class IncomeMapping
    {
        /// <summary>Converts validated IncomeData DTO into the domain Income aggregate.</summary>
        public static Income ToDomain(this IncomeData src, Guid persoid, string createdBy)
        {
            return new Income
            {
                Persoid = persoid,
                NetSalary = src.NetSalary,
                SalaryFrequency = src.SalaryFrequency,
                CreatedBy = createdBy,
                CreatedTime = DateTime.UtcNow,

                SideHustles = src.SideHustles.Select(s => new SideHustle
                {
                    Name = s.Name,
                    MonthlyIncome = s.Income
                }).ToList(),

                HouseholdMembers = src.HouseholdMembers.Select(h => new HouseholdMember
                {
                    Name = h.Name,
                    IncomeAmount = h.Income,
                    IncomeFrequency = h.Frequency
                }).ToList()
            };
        }
    }
}
