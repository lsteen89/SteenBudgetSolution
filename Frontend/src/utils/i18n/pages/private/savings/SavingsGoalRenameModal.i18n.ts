export const savingsGoalRenameModalDict = {
  sv: {
    eyebrow: "Sparmål",
    title: "Byt namn",
    description:
      "Det här namnet visas i dashboarden, månadsvyn och arkivet.",
    closeAriaLabel: "Stäng byt namn",
    nameLabel: "Nytt namn",
    nameHint: "Använd minst 1, max 255 tecken.",
    nameRequired: "Ange ett namn.",
    nameTooLong: "Namnet får vara högst 255 tecken.",
    nameUnchanged: "Namnet är detsamma som tidigare — ingen ändring.",
    saveChanges: "Spara",
    saving: "Sparar...",
    cancel: "Avbryt",
    footerNote: "Påverkar inte tidigare avslutade mål.",
    toastSuccess: "Sparmålet har bytt namn.",
    toastError: "Det gick inte att byta namn. Försök igen.",
    toastErrorMonthClosed:
      "Månaden är stängd — namnet kan inte ändras här.",
    toastErrorSourcePlanMissing:
      "Sparmålet i planen saknas. Ladda om sidan och försök igen.",
    toastErrorRowGone:
      "Sparmålet finns inte längre i den här månaden.",
  },
  en: {
    eyebrow: "Savings goal",
    title: "Rename goal",
    description:
      "This name is shown on the dashboard, in the month view, and in the archive.",
    closeAriaLabel: "Close rename goal",
    nameLabel: "New name",
    nameHint: "Use between 1 and 255 characters.",
    nameRequired: "Enter a name.",
    nameTooLong: "The name can be at most 255 characters.",
    nameUnchanged: "Same name as before — no change.",
    saveChanges: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    footerNote: "Closed goals are not affected.",
    toastSuccess: "Savings goal renamed.",
    toastError: "Could not rename the goal. Try again.",
    toastErrorMonthClosed:
      "This month is closed — the goal can't be renamed here.",
    toastErrorSourcePlanMissing:
      "The linked goal in the plan is gone. Reload the page and try again.",
    toastErrorRowGone:
      "The goal no longer exists in this month.",
  },
  et: {
    eyebrow: "Säästueesmärk",
    title: "Muuda nime",
    description:
      "Seda nime kuvatakse töölaual, kuuvaates ja arhiivis.",
    closeAriaLabel: "Sulge nime muutmine",
    nameLabel: "Uus nimi",
    nameHint: "Kasuta vähemalt 1, kõige rohkem 255 tähemärki.",
    nameRequired: "Sisesta nimi.",
    nameTooLong: "Nimi võib olla kuni 255 tähemärki.",
    nameUnchanged: "Sama nimi nagu enne — muudatus puudub.",
    saveChanges: "Salvesta",
    saving: "Salvestab...",
    cancel: "Tühista",
    footerNote: "Suletud eesmärke ei mõjuta.",
    toastSuccess: "Säästueesmärk on ümber nimetatud.",
    toastError: "Nime ei õnnestunud muuta. Proovi uuesti.",
    toastErrorMonthClosed:
      "Kuu on suletud — nime siin muuta ei saa.",
    toastErrorSourcePlanMissing:
      "Plaani seotud eesmärki pole enam. Lae leht uuesti ja proovi uuesti.",
    toastErrorRowGone:
      "Eesmärki selles kuus enam ei ole.",
  },
} as const;
