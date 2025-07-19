using Backend.Domain.Enums;
using System.Collections.Generic;

namespace Backend.Application.DTO.Budget.Income
{
    public sealed class IncomeData       
    {
        public decimal? NetSalary { get; set; }
        public Frequency SalaryFrequency { get; set; }
        public bool? ShowHouseholdMembers { get; set; }
        public bool? ShowSideIncome { get; set; }
        public List<SideHustleDto> SideHustles { get; set; } = new();
        public List<HouseholdMemberDto> HouseholdMembers { get; set; } = new();
    }
}
