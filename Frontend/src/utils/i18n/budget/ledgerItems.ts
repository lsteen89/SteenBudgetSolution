import type { AppLocale } from "@/types/i18n/appLocale";
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

const et: Record<string, string> = {
  housingmonthlyrent: "Üür / eluasemekulud",
  rent: "Üür",
  rentextrafees: "Lisatasud",
  fuelorcharging: "Kütus / laadimine",
  fuel: "Kütus",
  carinsurance: "Autokindlustus",
  parkingfee: "Parkimine",
  othercarcosts: "Muud autokulud",
  publictransit: "Ühistransport",

  foodstore: "Toidukaubad",
  takeout: "Väljas söömine",

  electricity: "Elekter",
  heating: "Küte",
  water: "Vesi",

  insurance: "Kindlustus",
  internet: "Internet",
  phone: "Telefon",

  clothing: "Riided",
};

export function labelLedgerItem(raw: string, locale: AppLocale) {
  // normalize=true means we key by normalized strings
  return tDict(raw, locale, { sv, en, et }, { normalize: true, fallback: raw });
}
