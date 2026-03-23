export const subStepFixedExpensesDict = {
  sv: {
    pillMajor: "Utgifter",
    pillSub: "Räkningar & nödvändigheter",

    subtitle:
      "Lägg in räkningar du betalar de flesta månader. Du kan alltid justera dessa senare.",

    guardSubsEmphasis: "Prenumerationer",
    guardSubsTo: "eget steg",
    guardSubsDetail: "(Netflix/Spotify)",
    guardCarInsuranceEmphasis: "Bilförsäkring",
    guardCarInsuranceTo: "Transport",

    helpTitle: "Vad räknas som “räkningar” här?",
    help1: "Hemförsäkring, internet, telefoni, gym/medlemskap.",
    help2: "Sånt som varierar mycket (mat, spontanköp) kommer i andra steg.",

    // suggested fields
    insuranceLabel: "Försäkring",
    insurancePlaceholder: "t.ex. 300",
    insuranceHelp:
      "Hem/boende- och personförsäkringar (t.ex. hem, liv). Bilförsäkring fylls i under Transport.",

    internetLabel: "Internet",
    internetPlaceholder: "t.ex. 400",
    internetHelp: "Månadskostnad för bredband/uppkoppling.",

    phoneLabel: "Telefoni",
    phonePlaceholder: "t.ex. 250",
    phoneHelp: "Månadskostnad för mobil/telefoni.",

    gymLabel: "Träning / medlemskap",
    gymPlaceholder: "t.ex. 200",
    gymHelp: "Gym eller andra medlemskap.",

    // custom accordion
    customTitle: "Egna räkningar",
    customRowNamePlaceholder: "Namn på räkning (t.ex. förskola)",
    customRowAmountPlaceholder: "Belopp",

    // totals
    totalTitle: "Totalt räkningar",
    totalSubtitle: "Summa för räkningar & egna räkningar per månad",
    totalSuffix: "/mån",
  },

  en: {
    pillMajor: "Expenses",
    pillSub: "Bills & essentials",

    subtitle:
      "Add bills you pay most months. You can always adjust these later.",

    guardSubsEmphasis: "Subscriptions",
    guardSubsTo: "separate step",
    guardSubsDetail: "(Netflix/Spotify)",
    guardCarInsuranceEmphasis: "Car insurance",
    guardCarInsuranceTo: "Transport",

    helpTitle: "What counts as “bills” here?",
    help1: "Home insurance, internet, phone plan, gym/memberships.",
    help2:
      "Things that vary a lot (food, impulse spending) are handled in other steps.",

    insuranceLabel: "Insurance",
    insurancePlaceholder: "e.g. 30",
    insuranceHelp:
      "Home/housing and personal insurance (e.g. home, life). Car insurance belongs in Transport.",

    internetLabel: "Internet",
    internetPlaceholder: "e.g. 40",
    internetHelp: "Monthly cost for broadband/connection.",

    phoneLabel: "Phone",
    phonePlaceholder: "e.g. 20",
    phoneHelp: "Monthly cost for mobile/phone plan.",

    gymLabel: "Training / membership",
    gymPlaceholder: "e.g. 20",
    gymHelp: "Gym or other memberships.",

    customTitle: "Custom bills",
    customRowNamePlaceholder: "Bill name (e.g. daycare)",
    customRowAmountPlaceholder: "Amount",

    totalTitle: "Total bills",
    totalSubtitle: "Bills + custom bills per month",
    totalSuffix: "/mo",
  },

  et: {
    pillMajor: "Kulud",
    pillSub: "Arved & vältimatud kulud",

    subtitle:
      "Lisa arved, mida maksad enamikul kuudel. Saad neid hiljem alati muuta.",

    guardSubsEmphasis: "Tellimused",
    guardSubsTo: "eraldi samm",
    guardSubsDetail: "(Netflix/Spotify)",
    guardCarInsuranceEmphasis: "Autokindlustus",
    guardCarInsuranceTo: "Transport",

    helpTitle: "Mis loetakse siin “arveteks”?",
    help1: "Kodukindlustus, internet, telefon, jõusaal/liikmelisused.",
    help2:
      "Asjad, mis kõiguvad palju (toit, impulssostud) tulevad teistes sammudes.",

    insuranceLabel: "Kindlustus",
    insurancePlaceholder: "nt 30",
    insuranceHelp:
      "Kodu/eluaseme ja isikukindlustused (nt kodu, elu). Autokindlustus käib Transpordi alla.",

    internetLabel: "Internet",
    internetPlaceholder: "nt 40",
    internetHelp: "Igakuine kulu interneti/ühenduse eest.",

    phoneLabel: "Telefon",
    phonePlaceholder: "nt 25",
    phoneHelp: "Igakuine kulu mobiili/telefoniplaani eest.",

    gymLabel: "Trenn / liikmelisus",
    gymPlaceholder: "nt 20",
    gymHelp: "Jõusaal või muud liikmelisused.",

    customTitle: "Oma arved",
    customRowNamePlaceholder: "Arve nimi (nt lasteaed)",
    customRowAmountPlaceholder: "Summa",

    totalTitle: "Arved kokku",
    totalSubtitle: "Arved + oma arved kuus",
    totalSuffix: "/kuu",
  },
} as const;
