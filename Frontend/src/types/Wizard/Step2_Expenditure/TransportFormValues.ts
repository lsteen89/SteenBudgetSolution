export interface TransportForm {
    fuelOrCharging: number | null;
    carInsurance: number | null;
    parkingFee: number | null;
    otherCarCosts: number | null;
    publicTransit: number | null;
}

export type TransportFormShape = { transport: TransportForm };