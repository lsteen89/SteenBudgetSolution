import type { ItemKey } from "@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/1_SubStepWelcome/ExpenditureOverviewMainText";

export const wizardExpenditureOverviewDict = {
  sv: {
    majorLabel: "Utgifter",
    subLabel: "Intro",

    title: "Ta kontroll över dina utgifter",
    lead: "Du kan alltid gå tillbaka. Vi håller ordning åt dig.",

    done: "Klar",
    goTo: "Gå till",
    followOrder: "Följ ordningen",
    jumpBackHint: "Du kan hoppa tillbaka hit när som helst.",

    ctaStartWithHousing: "Starta med Boende",

    tip: "Tips: Du kan gå direkt till en kategori om du redan fyllt i den tidigare.",
  },
  en: {
    majorLabel: "Expenses",
    subLabel: "Intro",

    title: "Take control of your expenses",
    lead: "You can always go back. We keep things organized for you.",

    done: "Done",
    goTo: "Go to",
    followOrder: "Follow the order",
    jumpBackHint: "You can jump back here anytime.",

    ctaStartWithHousing: "Start with Housing",

    tip: "Tip: You can jump straight to a category if you’ve already filled it in before.",
  },
  et: {
    majorLabel: "Kulud",
    subLabel: "Sissejuhatus",

    title: "Võta oma kulud kontrolli alla",
    lead: "Sa saad alati tagasi minna. Me hoiame järje sinu eest.",

    done: "Valmis",
    goTo: "Mine",
    followOrder: "Järgi järjekorda",
    jumpBackHint: "Sa saad siia igal ajal tagasi hüpata.",

    ctaStartWithHousing: "Alusta eluasemest",

    tip: "Vihje: Kui oled selle varem täitnud, saad minna otse kategooriasse.",
  },
} as const;

// Structured content kept OUTSIDE Dict3
export const wizardExpenditureOverviewItems: Record<
  "sv" | "en" | "et",
  Record<ItemKey, { title: string; desc: string }>
> = {
  sv: {
    boende: { title: "Boende", desc: "Hyra, bolån och andra boendekostnader." },
    fasta: {
      title: "Fasta utgifter",
      desc: "El, vatten, internet och försäkringar.",
    },
    mat: { title: "Mat", desc: "Matbutik, hämtmat och restaurangbesök." },
    transport: { title: "Transport", desc: "Bil eller kollektivtrafik." },
    klader: { title: "Kläder", desc: "Uppskattad månadskostnad." },
    prenumerationer: {
      title: "Prenumerationer",
      desc: "Streaming och andra tjänster.",
    },
  },
  en: {
    boende: {
      title: "Housing",
      desc: "Rent, mortgage, and other housing costs.",
    },
    fasta: {
      title: "Bills",
      desc: "Electricity, water, internet, and insurance.",
    },
    mat: { title: "Food", desc: "Groceries, takeout, and restaurants." },
    transport: { title: "Transport", desc: "Car costs or public transit." },
    klader: { title: "Clothing", desc: "Estimated monthly cost." },
    prenumerationer: {
      title: "Subscriptions",
      desc: "Streaming and other services.",
    },
  },
  et: {
    boende: { title: "Eluase", desc: "Üür, kodulaen ja muud eluasemekulud." },
    fasta: {
      title: "Püsikulud",
      desc: "Elekter, vesi, internet ja kindlustused.",
    },
    mat: { title: "Toit", desc: "Toidupood, kaasavõtt ja restoranid." },
    transport: { title: "Transport", desc: "Auto või ühistransport." },
    klader: { title: "Riided", desc: "Hinnanguline kuukulu." },
    prenumerationer: {
      title: "Tellimused",
      desc: "Voogedastus ja muud teenused.",
    },
  },
} as const;
