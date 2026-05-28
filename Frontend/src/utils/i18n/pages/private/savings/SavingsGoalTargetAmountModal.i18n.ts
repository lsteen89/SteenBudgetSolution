export const savingsGoalTargetAmountModalDict = {
  sv: {
    eyebrow: "Sparmål",
    title: "Ändra målbelopp",
    description:
      "Justera hur stort målet ska vara. Sparat hittills påverkas inte.",
    closeAriaLabel: "Stäng ändra målbelopp",
    amountLabel: "Nytt målbelopp",
    saveChanges: "Spara",
    saving: "Sparar...",
    cancel: "Avbryt",
    footerNote: "Stängda månader påverkas aldrig.",
    amountRequired: "Ange ett målbelopp.",
    amountInvalid: "Ange ett giltigt belopp med högst 2 decimaler.",
    amountNotPositive: "Målbeloppet måste vara större än 0 kr.",
    amountBelowSaved:
      "Målbeloppet kan inte vara lägre än det du redan sparat ({saved}).",
    amountTooLarge: "Målbeloppet får inte vara större än 10 000 000 kr.",
    amountUnchanged: "Samma belopp som tidigare — ingen ändring.",
    outcomeLabel: "Effekt på målet",
    outcomeOngoing:
      "Målet får ett mål på {target}. Med {monthly} kr/mån når du dit om ca {months} mån.",
    outcomeOngoingNoMonthly:
      "Målet får ett mål på {target}. Sätt ett månadsbelopp för att se när du når dit.",
    outcomeReached:
      "Du är redan framme — det nya målet motsvarar det du sparat ({saved}).",
    snapshotSavedLabel: "Sparat",
    snapshotTargetLabel: "Mål",
    snapshotDeadlineLabel: "Måldatum",
    snapshotDeadlineOngoing: "Löpande",
    toastSuccess: "Målbeloppet är uppdaterat.",
    toastError: "Det gick inte att ändra målbeloppet. Försök igen.",
    toastErrorTargetBelowSaved:
      "Målbeloppet kan inte vara lägre än det du redan sparat.",
    toastErrorMonthClosed:
      "Månaden är stängd. Öppna en aktuell månad och försök igen.",
  },
  en: {
    eyebrow: "Savings goal",
    title: "Change target amount",
    description:
      "Adjust how large the goal should be. The saved-so-far amount is not affected.",
    closeAriaLabel: "Close change target amount",
    amountLabel: "New target amount",
    saveChanges: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    footerNote: "Closed months are never affected.",
    amountRequired: "Enter a target amount.",
    amountInvalid: "Enter a valid amount with up to 2 decimals.",
    amountNotPositive: "The target amount must be greater than 0.",
    amountBelowSaved:
      "The target cannot be lower than what you have already saved ({saved}).",
    amountTooLarge: "The target cannot exceed 10,000,000.",
    amountUnchanged: "Same amount as before — no change.",
    outcomeLabel: "Goal impact",
    outcomeOngoing:
      "Target becomes {target}. At {monthly}/month you reach it in about {months} months.",
    outcomeOngoingNoMonthly:
      "Target becomes {target}. Set a monthly amount to see when you reach it.",
    outcomeReached:
      "You're already there — the new target matches what you've saved ({saved}).",
    snapshotSavedLabel: "Saved",
    snapshotTargetLabel: "Target",
    snapshotDeadlineLabel: "Deadline",
    snapshotDeadlineOngoing: "Ongoing",
    toastSuccess: "Target amount updated.",
    toastError: "Could not change the target amount. Try again.",
    toastErrorTargetBelowSaved:
      "The target cannot be lower than what you have already saved.",
    toastErrorMonthClosed: "The month is closed. Open a current month and try again.",
  },
  et: {
    eyebrow: "Säästueesmärk",
    title: "Muuda eesmärgi summat",
    description:
      "Muuda eesmärgi suurust. Juba säästetud summa ei muutu.",
    closeAriaLabel: "Sulge eesmärgi summa muutmine",
    amountLabel: "Uus eesmärgi summa",
    saveChanges: "Salvesta",
    saving: "Salvestab...",
    cancel: "Tühista",
    footerNote: "Suletud kuid ei mõjuta.",
    amountRequired: "Sisesta eesmärgi summa.",
    amountInvalid: "Sisesta kehtiv summa kuni 2 kümnendkohaga.",
    amountNotPositive: "Eesmärgi summa peab olema suurem kui 0.",
    amountBelowSaved:
      "Eesmärk ei saa olla väiksem juba säästetud summast ({saved}).",
    amountTooLarge: "Eesmärgi summa ei tohi olla suurem kui 10 000 000.",
    amountUnchanged: "Sama summa nagu enne — muudatus puudub.",
    outcomeLabel: "Mõju eesmärgile",
    outcomeOngoing:
      "Eesmärgiks saab {target}. {monthly}/kuus jõuad sinna umbes {months} kuuga.",
    outcomeOngoingNoMonthly:
      "Eesmärgiks saab {target}. Määra kuumakse, et näha, millal jõuad sinna.",
    outcomeReached:
      "Oled juba kohal — uus eesmärk vastab juba säästetud summale ({saved}).",
    snapshotSavedLabel: "Säästetud",
    snapshotTargetLabel: "Eesmärk",
    snapshotDeadlineLabel: "Tähtaeg",
    snapshotDeadlineOngoing: "Jätkuv",
    toastSuccess: "Eesmärgi summa on uuendatud.",
    toastError: "Eesmärgi summat ei õnnestunud muuta. Proovi uuesti.",
    toastErrorTargetBelowSaved:
      "Eesmärk ei saa olla väiksem juba säästetud summast.",
    toastErrorMonthClosed: "Kuu on suletud. Ava aktiivne kuu ja proovi uuesti.",
  },
} as const;
