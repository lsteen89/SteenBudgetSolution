export const subStepConfirmDebtsDict = {
  sv: {
    pillMajor: "Skulder",
    pillSub: "Sammanfattning",

    titleSummary: "Sammanfattning",
    subtitlePreviewMissing: "Vi kunde inte visa förhandsvisningen just nu.",
    helpTitleContinue: "Du kan fortfarande fortsätta",
    help1: "Slutför guiden ändå — allt kan justeras efteråt.",
    help2: "Om du vill se siffrorna: gå tillbaka och försök igen.",
    previewMissingBox:
      "Förhandsvisningen saknas. Du kan fortfarande gå vidare.",

    subtitleMain:
      "Här är en nulägesbild och ett enkelt val för hur du vill prioritera.",

    avalancheHeroOutcome: "Sparar mest ränta över tid.",
    avalancheSubtitle: "Extra pengar går till högst ränta först.",
    avalancheTip: "Bra när räntan skiljer mycket mellan skulder.",
    avalancheEstimateTemplate: "Ca {amount} i ränta idag*",

    snowballHeroOutcome: "Snabbaste första vinsten.",
    snowballSubtitle: "Extra pengar går till minsta skuld först.",
    snowballTip: "Bra om du vill få momentum tidigt.",
    snowballEstimateTemplate: "Första skuld borta om ca {months} mån*",
    snowballFootnote:
      "* Grova estimat baserat på dagens saldo/betalning. Resultat kan skilja sig.",

    targetChipAprTemplate: "{name} ({apr}%)",
    targetChipBalanceTemplate: "{name} ({amount})",

    none: "—",
  },

  en: {
    pillMajor: "Debts",
    pillSub: "Summary",

    titleSummary: "Summary",
    subtitlePreviewMissing: "We could not show the preview right now.",
    helpTitleContinue: "You can still continue",
    help1: "Finish the wizard anyway — everything can be adjusted later.",
    help2: "If you want to see the numbers, go back and try again.",
    previewMissingBox: "The preview is missing. You can still continue.",

    subtitleMain:
      "Here is a snapshot of your current situation and a simple choice for how you want to prioritize.",

    avalancheHeroOutcome: "Saves the most interest over time.",
    avalancheSubtitle: "Extra money goes to the highest interest first.",
    avalancheTip: "Best when the interest rates differ a lot between debts.",
    avalancheEstimateTemplate: "About {amount} in interest today*",

    snowballHeroOutcome: "Fastest first win.",
    snowballSubtitle: "Extra money goes to the smallest debt first.",
    snowballTip: "Good if you want momentum early.",
    snowballEstimateTemplate: "First debt gone in about {months} mo*",
    snowballFootnote:
      "* Rough estimates based on today’s balance/payment. Actual results may differ.",

    targetChipAprTemplate: "{name} ({apr}%)",
    targetChipBalanceTemplate: "{name} ({amount})",

    none: "—",
  },

  et: {
    pillMajor: "Võlad",
    pillSub: "Kokkuvõte",

    titleSummary: "Kokkuvõte",
    subtitlePreviewMissing: "Me ei saanud eelvaadet praegu kuvada.",
    helpTitleContinue: "Saad siiski jätkata",
    help1: "Lõpeta juhend ikkagi — kõike saab hiljem muuta.",
    help2: "Kui soovid numbreid näha, mine tagasi ja proovi uuesti.",
    previewMissingBox: "Eelvaade puudub. Saad siiski edasi minna.",

    subtitleMain:
      "Siin on ülevaade sinu praegusest olukorrast ja lihtne valik, kuidas soovid prioriseerida.",

    avalancheHeroOutcome: "Säästab ajas kõige rohkem intressi.",
    avalancheSubtitle: "Lisaraha läheb kõige kõrgema intressiga võlale.",
    avalancheTip: "Hea siis, kui intressimäärad erinevad võlgade vahel palju.",
    avalancheEstimateTemplate: "Umbes {amount} intressi täna*",

    snowballHeroOutcome: "Kõige kiirem esimene võit.",
    snowballSubtitle: "Lisaraha läheb kõige väiksemale võlale.",
    snowballTip: "Hea, kui soovid varakult hoogu sisse saada.",
    snowballEstimateTemplate: "Esimene võlg kaob umbes {months} kuuga*",
    snowballFootnote:
      "* Ligikaudsed hinnangud tänase saldo/makse põhjal. Tegelik tulemus võib erineda.",

    targetChipAprTemplate: "{name} ({apr}%)",
    targetChipBalanceTemplate: "{name} ({amount})",

    none: "—",
  },
} as const;
