export const subStepSubscriptionsDict = {
  sv: {
    pillMajor: "Utgifter",
    pillSub: "Prenumerationer",
    title: "Prenumerationer",
    subtitle:
      "Lägg in streaming och andra prenumerationer du betalar varje månad.",
    guardrailBillsEmphasis: "Räkningar",
    guardrailBillsTo: "annat steg",
    guardrailBillsDetail: "(internet/telefoni)",

    helpTitle: "Vad räknas som prenumerationer?",
    help1: "Streaming, musik, appar och digitala medlemskap.",
    help2:
      "Om du är osäker: lägg in det som en egen prenumeration så blir det rätt i totalen.",

    customTitle: "Egna prenumerationer",
    customSubtitle: "Lägg till dina egna tjänster och månadskostnader.",
    addLabel: "Lägg till prenumeration",
    namePlaceholder: "Namn (t.ex. iCloud)",
    amountPlaceholder: "Belopp",

    totalTitle: "Totalt prenumerationer",
    totalSubtitle: "Summa för prenumerationer per månad",
    totalSuffix: "/mån",
  },

  en: {
    pillMajor: "Expenses",
    pillSub: "Subscriptions",
    title: "Subscriptions",
    subtitle: "Add streaming and other subscriptions you pay every month.",
    guardrailBillsEmphasis: "Bills",
    guardrailBillsTo: "a different step",
    guardrailBillsDetail: "(internet/phone)",

    helpTitle: "What counts as subscriptions?",
    help1: "Streaming, music, apps, and digital memberships.",
    help2:
      "If you’re unsure: add it as a custom subscription so the totals stay correct.",

    customTitle: "Custom subscriptions",
    customSubtitle: "Add your own services and monthly costs.",
    addLabel: "Add subscription",
    namePlaceholder: "Name (e.g. cloud storage)",
    amountPlaceholder: "Amount",

    totalTitle: "Total subscriptions",
    totalSubtitle: "Sum of subscriptions per month",
    totalSuffix: "/mo",
  },

  et: {
    pillMajor: "Kulud",
    pillSub: "Tellimused",
    title: "Tellimused",
    subtitle: "Lisa voogedastus ja muud tellimused, mida maksad igal kuul.",
    guardrailBillsEmphasis: "Arved",
    guardrailBillsTo: "teises sammus",
    guardrailBillsDetail: "(internet/telefon)",

    helpTitle: "Mis loetakse tellimusteks?",
    help1: "Voogedastus, muusika, rakendused ja digitaalsed liikmelisused.",
    help2:
      "Kui pole kindel: lisa see eraldi tellimusena, et kogusumma oleks korrektne.",

    customTitle: "Oma tellimused",
    customSubtitle: "Lisa oma teenused ja kuutasud.",
    addLabel: "Lisa tellimus",
    namePlaceholder: "Nimi (nt pilvesalvestus)",
    amountPlaceholder: "Summa",

    totalTitle: "Tellimused kokku",
    totalSubtitle: "Tellimuste summa kuus",
    totalSuffix: "/kuu",
  },
} as const;
