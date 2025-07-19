namespace Backend.Common.Constants.Budget
{
    public static class ExpenseItemLabels
    {
        // Rent
        public const string Rent = "Rent";
        public const string RentExtraFees = "RentExtraFees";
        public const string MonthlyFee = "MonthlyFee";
        public const string BrfExtraFees = "BrfExtraFees";
        public const string MortgagePayment = "MortgagePayment";
        public const string HouseOtherCosts = "HouseOtherCosts";
        public const string OtherCosts = "OtherCosts";

        // Food
        public const string FoodStore = "FoodStore"; 
        public const string Takeout = "Takeout";

        // Transport
        public const string Fuel = "Fuel";
        public const string Insurance = "Insurance";       
        public const string TotalCarCost = "TotalCarCost";
        public const string Transit = "Transit";

        // Clothing
        public const string Clothing = "Clothing";

        // Fixed Expenses
        public const string Electricity = "Electricity";
        public const string Internet = "Internet";
        public const string Phone = "Phone";
        public const string UnionFees = "UnionFees";
        // Insurance reused OR create FixedInsurance if needed

        // Subscriptions (predefined)
        public const string Netflix = "Netflix";
        public const string Spotify = "Spotify";
        public const string HBOMax = "HBOMax";     // match FE key 'hbomax'
        public const string Viaplay = "Viaplay";
        public const string DisneyPlus = "DisneyPlus";
    }

}
