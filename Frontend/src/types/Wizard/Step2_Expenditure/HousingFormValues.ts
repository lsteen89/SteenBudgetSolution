export type HousingType = "rent" | "brf" | "house" | "free";

export interface HousingPaymentForm {
    monthlyRent: number | null;
    monthlyFee: number | null;
    extraFees: number | null;
}

export interface HousingRunningCostsForm {
    electricity: number | null;
    heating: number | null;
    water: number | null;
    waste: number | null;
    other: number | null;
}

export interface HousingForm {
    homeType: HousingType | "";
    payment: HousingPaymentForm;
    runningCosts: HousingRunningCostsForm;
}