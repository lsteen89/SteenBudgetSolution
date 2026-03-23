export const debtTemplateModalDict = {
  sv: {
    ariaLabel: "Välj en mall för din skuld",
    title: "Välj en mall för din skuld",
    description: "Starta snabbt med en vanlig mall, eller skapa en egen skuld.",
    blankTitle: "Skapa egen skuld",
    blankDescription: "Eget namn, egna villkor.",

    metaMinPaymentTemplate: "Minsta betalning {amount}",
    metaFlexibleRepayment: "Flexibel återbetalning",
    metaTermTemplate: "Löptid {months} mån",
    metaMonthlyFeeTemplate: "+ {amount}/mån",
  },

  en: {
    ariaLabel: "Choose a template for your debt",
    title: "Choose a template for your debt",
    description:
      "Get started quickly with a common template, or create your own debt.",
    blankTitle: "Create custom debt",
    blankDescription: "Your own name, your own terms.",

    metaMinPaymentTemplate: "Minimum payment {amount}",
    metaFlexibleRepayment: "Flexible repayment",
    metaTermTemplate: "Term {months} mo",
    metaMonthlyFeeTemplate: "+ {amount}/mo",
  },

  et: {
    ariaLabel: "Vali oma võlale mall",
    title: "Vali oma võlale mall",
    description: "Alusta kiiresti levinud malliga või loo oma võlg ise.",
    blankTitle: "Loo oma võlg",
    blankDescription: "Oma nimi, oma tingimused.",

    metaMinPaymentTemplate: "Miinimummakse {amount}",
    metaFlexibleRepayment: "Paindlik tagasimakse",
    metaTermTemplate: "Periood {months} kuud",
    metaMonthlyFeeTemplate: "+ {amount}/kuu",
  },
} as const;
