export const subStepFoodDict = {
  sv: {
    pillMajor: "Utgifter",
    pillSub: "Mat",

    subtitle:
      "Uppskatta vad du spenderar på matbutik och hämtmat. Ta gärna ett snitt på tre månader.",

    helpTitle: "Tips för en bättre siffra",
    help1: "Kolla kontoutdrag och ta snittet av **2–3 senaste månaderna**.",
    help2:
      "**Matbutik** = vardagsmat & storhandling. **Hämtmat** = restaurang/leverans.",
    help3:
      "Om det varierar: välj en **normalmånad** hellre än en dyr/billig extremmånad.",

    storeTitle: "Matbutik",
    takeoutTitle: "Hämtmat",

    storePlaceholder: "t.ex. 3 500",
    takeoutPlaceholder: "t.ex. 800",

    totalTitle: "Totalt mat",
    totalSubtitle: "Summa för matbutik + hämtmat per månad",
    totalSuffix: "/mån",
  },

  en: {
    pillMajor: "Expenses",
    pillSub: "Food",

    subtitle:
      "Estimate what you spend on groceries and takeout. Ideally use an average of three months.",

    helpTitle: "Tips for a better estimate",
    help1: "Check your bank statements and average the **last 2–3 months**.",
    help2:
      "**Groceries** = everyday food & big shopping. **Takeout** = restaurant/delivery.",
    help3:
      "If it varies: pick a **normal month** rather than an expensive/cheap extreme month.",

    storeTitle: "Groceries",
    takeoutTitle: "Takeout",

    storePlaceholder: "e.g. 3,500",
    takeoutPlaceholder: "e.g. 800",

    totalTitle: "Total food",
    totalSubtitle: "Groceries + takeout per month",
    totalSuffix: "/mo",
  },

  et: {
    pillMajor: "Kulud",
    pillSub: "Toit",

    subtitle:
      "Hinda, kui palju kulutad toidupoele ja tellitud toidule. Soovitame võtta kolme kuu keskmise.",

    helpTitle: "Nipid parema numbri jaoks",
    help1: "Vaata konto väljavõtteid ja võta **viimase 2–3 kuu keskmine**.",
    help2:
      "**Toidupood** = igapäevane toit & suurem ost. **Tellitud toit** = restoran/kohaletoimetus.",
    help3:
      "Kui see kõigub: vali pigem **tavaline kuu** kui väga kallis/odav erandkuu.",

    storeTitle: "Toidupood",
    takeoutTitle: "Tellitud toit",

    storePlaceholder: "nt 3 500",
    takeoutPlaceholder: "nt 800",

    totalTitle: "Toit kokku",
    totalSubtitle: "Toidupood + tellitud toit kuus",
    totalSuffix: "/kuu",
  },
} as const;
