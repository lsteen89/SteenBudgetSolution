import type { AppLocale } from "@/utils/i18n/locale";
import { tDict } from "@/utils/i18n/translate";

const sv: Record<string, string> = {
    // normalized keys!
    housingmonthlyrent: "Hyra / boendeavgift",
    rent: "Hyra",
    rentextrafees: "Extra avgifter",
    fuelorcharging: "Bränsle / laddning",
    fuel: "Bränsle",
    carinsurance: "Bilförsäkring",
    parkingfee: "Parkering",
    othercarcosts: "Övriga bilkostnader",
    publictransit: "Kollektivtrafik",

    foodstore: "Matbutik",
    takeout: "Uteätande / hämtmat",

    electricity: "El",
    heating: "Uppvärmning",
    water: "Vatten",
    waste: "Sophämtning",
    housingextrafees: "Extra avgifter",
    otherhomerunningcosts: "Övriga boendekostnader",


    insurance: "Försäkring",
    internet: "Internet",
    phone: "Telefon",

    clothing: "Kläder",
};

const en: Record<string, string> = {
    housingmonthlyrent: "Rent / housing fee",
    rent: "Rent",
    rentextrafees: "Extra fees",
    fuelorcharging: "Fuel / charging",
    fuel: "Fuel",
    carinsurance: "Car insurance",
    parkingfee: "Parking",
    othercarcosts: "Other car costs",
    publictransit: "Public transit",

    foodstore: "Groceries",
    takeout: "Takeout / eating out",

    electricity: "Electricity",
    heating: "Heating",
    water: "Water",

    insurance: "Insurance",
    internet: "Internet",
    phone: "Phone",

    clothing: "Clothing",
};

export function labelLedgerItem(raw: string, locale: AppLocale) {
    // normalize=true means we key by normalized strings
    return tDict(raw, locale, { sv, en }, { normalize: true, fallback: raw });
}
