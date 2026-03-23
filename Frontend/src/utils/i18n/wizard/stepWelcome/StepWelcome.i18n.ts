export const wizardWelcomeDict = {
  sv: {
    title: "Kom igång med din budget",
    welcomeWithName: "Välkommen {name}.",
    welcomeGeneric: "Kul att du är här. Vi börjar med några snabba uppgifter.",
    time: "Tid: 5–10 minuter",
    pause: "pausa när som helst",
    autosave: "vi sparar automatiskt",

    currencyLabel: "Valuta för din budget",
    currencyDesc:
      "Välj vilken valuta som ska användas genom hela guiden och i din budget.",
    saving: "Sparar dina inställningar…",

    whatHappens: "Det här händer nu.",
    showLess: "Visa färre",
    showAll: "Visa alla {count} steg",
  },

  en: {
    title: "Let’s set up your budget",
    welcomeWithName: "Welcome {name}.",
    welcomeGeneric: "Glad you’re here. Let’s start with a few quick details.",
    time: "Time: 5–10 minutes",
    pause: "pause anytime",
    autosave: "we save automatically",

    currencyLabel: "Budget currency",
    currencyDesc:
      "Choose the currency that will be used throughout the guide and your budget.",
    saving: "Saving your preferences…",

    whatHappens: "Here’s what happens next.",
    showLess: "Show fewer",
    showAll: "Show all {count} steps",
  },

  et: {
    title: "Alusta oma eelarvega",
    welcomeWithName: "Tere tulemast, {name}.",
    welcomeGeneric: "Tore, et oled siin. Alustame mõne kiire sammuga.",
    time: "Aeg: 5–10 minutit",
    pause: "võid igal ajal peatada",
    autosave: "salvestame automaatselt",

    currencyLabel: "Eelarve valuuta",
    currencyDesc:
      "Vali valuuta, mida kasutatakse kogu juhendis ja sinu eelarves.",
    saving: "Salvestame sinu eelistusi…",

    whatHappens: "Mis juhtub järgmisena.",
    showLess: "Näita vähem",
    showAll: "Näita kõiki {count} sammu",
  },
} as const;

export const wizardWelcomeSteps = {
  sv: {
    income: { title: "Inkomster", desc: "vad du får in och hur ofta" },
    expenses: { title: "Utgifter", desc: "fasta & rörliga kostnader" },
    savings: { title: "Sparande", desc: "buffert, mål och sparande" },
    debts: { title: "Skulder", desc: "lån, krediter och återbetalning" },
    confirm: {
      title: "Bekräfta",
      desc: "sammanfattning innan du skapar budgeten",
    },
  },
  en: {
    income: { title: "Income", desc: "what you earn and how often" },
    expenses: { title: "Expenses", desc: "fixed and variable costs" },
    savings: { title: "Savings", desc: "buffer, goals and saving" },
    debts: { title: "Debts", desc: "loans, credit and repayments" },
    confirm: {
      title: "Confirm",
      desc: "summary before creating your budget",
    },
  },
  et: {
    income: { title: "Sissetulekud", desc: "mida teenid ja kui tihti" },
    expenses: { title: "Kulud", desc: "püsivad ja muutuvad kulud" },
    savings: { title: "Säästud", desc: "puhver, eesmärgid ja säästmine" },
    debts: { title: "Võlad", desc: "laenud, krediidid ja tagasimaksed" },
    confirm: {
      title: "Kinnita",
      desc: "kokkuvõte enne eelarve loomist",
    },
  },
} as const;
