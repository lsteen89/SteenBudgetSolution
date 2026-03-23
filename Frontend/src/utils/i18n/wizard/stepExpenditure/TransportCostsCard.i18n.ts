export const transportCostsCardDict = {
  sv: {
    title: "Transport",
    totalSuffix: "/mån",

    fuelLabel: "Bränsle / laddning",
    fuelPlaceholder: "t.ex. 1 500",

    insuranceLabel: "Bilförsäkring",
    insurancePlaceholder: "t.ex. 500",

    parkingLabel: "Parkering",
    parkingPlaceholder: "t.ex. 900",
    parkingHelp: "P-plats/garage och återkommande parkeringsavgifter.",

    otherCarLabel: "Övriga bilkostnader",
    otherCarPlaceholder: "t.ex. 600",
    otherCarHelp: "Service/underhåll, trängselskatt, vägtullar och liknande.",

    transitLabel: "Kollektivtrafik",
    transitPlaceholder: "t.ex. 990",
    transitHelp: "Månadskort/periodkort och återkommande resor.",
  },

  en: {
    title: "Transport",
    totalSuffix: "/mo",

    fuelLabel: "Fuel / charging",
    fuelPlaceholder: "e.g. 100",

    insuranceLabel: "Car insurance",
    insurancePlaceholder: "e.g. 50",

    parkingLabel: "Parking",
    parkingPlaceholder: "e.g. 90",
    parkingHelp: "Parking spot/garage and recurring parking fees.",

    otherCarLabel: "Other car costs",
    otherCarPlaceholder: "e.g. 60",
    otherCarHelp: "Service/maintenance, tolls, congestion charges, etc.",

    transitLabel: "Public transport",
    transitPlaceholder: "e.g. 90",
    transitHelp: "Monthly passes and recurring trips.",
  },

  et: {
    title: "Transport",
    totalSuffix: "/kuu",

    fuelLabel: "Kütus / laadimine",
    fuelPlaceholder: "nt 150",

    insuranceLabel: "Autokindlustus",
    insurancePlaceholder: "nt 50",

    parkingLabel: "Parkimine",
    parkingPlaceholder: "nt 90",
    parkingHelp: "Parkimiskoht/garaaž ja korduvad parkimistasud.",

    otherCarLabel: "Muud autokulud",
    otherCarPlaceholder: "nt 20",
    otherCarHelp: "Hooldus/remont, teemaksud, ummikumaks jms.",

    transitLabel: "Ühistransport",
    transitPlaceholder: "nt 40",
    transitHelp: "Kuupiletid ja korduvad sõidud.",
  },
} as const;
