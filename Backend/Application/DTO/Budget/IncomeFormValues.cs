using Backend.Domain.Enums;
using System.Collections.Generic;

namespace Backend.Application.DTO.Budget
{
    public class IncomeData
    {
        public decimal NetSalary { get; set; }
        public Frequency SalaryFrequency { get; set; }

        // These two might not be needed if the frontend always sends them
        public bool? ShowHouseholdMembers { get; set; }
        public bool? ShowSideIncome { get; set; }
        
        public List<SideHustleData> SideHustles { get; set; } = new List<SideHustleData>();
        public List<HouseholdMemberData> HouseholdMembers { get; set; } = new List<HouseholdMemberData>();
    }
}
