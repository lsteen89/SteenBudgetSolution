export const editPeriodCardDict = {
  en: {
    mascotAlt: "Bird holding a wrench",
    needsAttention: "Needs attention",
    titleNegative: "Fix this period",
    titlePositive: "Review this period",
    descriptionNegative:
      "You are currently {amount} over budget in {periodLabel}. Adjust recurring costs and subscriptions.",
    descriptionPositive:
      "Update recurring costs and subscriptions for {periodLabel} without leaving the dashboard.",
    buttonNegative: "Fix your deficit",
    buttonPositive: "Edit this period",
  },

  sv: {
    mascotAlt: "Fågel med skiftnyckel",
    needsAttention: "Behöver ses över",
    titleNegative: "Rätta den här perioden",
    titlePositive: "Gå igenom perioden",
    descriptionNegative:
      "Du ligger just nu {amount} över budget i {periodLabel}. Justera återkommande kostnader och prenumerationer.",
    descriptionPositive:
      "Uppdatera återkommande kostnader och prenumerationer för {periodLabel} utan att lämna dashboarden.",
    buttonNegative: "Åtgärda underskottet",
    buttonPositive: "Redigera perioden",
  },

  et: {
    mascotAlt: "Mutrivõtmega lind",
    needsAttention: "Vajab tähelepanu",
    titleNegative: "Paranda see periood",
    titlePositive: "Vaata see periood üle",
    descriptionNegative:
      "Oled praegu perioodis {periodLabel} eelarvest {amount} üle. Kohanda püsikulusid ja tellimusi.",
    descriptionPositive:
      "Uuenda perioodi {periodLabel} püsikulusid ja tellimusi ilma juhtpaneelilt lahkumata.",
    buttonNegative: "Paranda puudujääk",
    buttonPositive: "Muuda seda perioodi",
  },
} as const;
