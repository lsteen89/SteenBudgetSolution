export const editPeriodCardDict = {
  en: {
    mascotAlt: "Bird holding a wrench",
    needsAttention: "Needs attention",
    titleNegative: "Fix this period",
    titlePositive: "Quickly adjust this period",
    descriptionNegative:
      "You are currently {amount} over budget in {periodLabel}. Adjust recurring costs and subscriptions.",
    descriptionPositive:
      "Update variable costs and subscriptions for {periodLabel} without leaving the dashboard.",
    buttonNegative: "Fix your deficit",
    buttonPositive: "Quickly adjust this period",
  },

  sv: {
    mascotAlt: "Fågel med skiftnyckel",
    needsAttention: "Behöver ses över",
    titleNegative: "Rätta den här perioden",
    titlePositive: "Snabbjustera den här perioden",
    descriptionNegative:
      "Du ligger just nu {amount} över budget i {periodLabel}. Justera återkommande kostnader och prenumerationer.",
    descriptionPositive:
      "Uppdatera rörliga kostnader och prenumerationer för {periodLabel} utan att lämna dashboarden.",
    buttonNegative: "Åtgärda underskottet",
    buttonPositive: "Snabbjustera perioden",
  },

  et: {
    mascotAlt: "Mutrivõtmega lind",
    needsAttention: "Vajab tähelepanu",
    titleNegative: "Paranda see periood",
    titlePositive: "Kiirelt kohanda seda perioodi",
    descriptionNegative:
      "Oled praegu perioodis {periodLabel} eelarvest {amount} üle. Kohanda püsikulusid ja tellimusi.",
    descriptionPositive:
      "Uuenda perioodi {periodLabel} muutuvkulusid ja tellimusi ilma juhtpaneelilt lahkumata.",
    buttonNegative: "Paranda puudujääk",
    buttonPositive: "Kiirelt kohanda seda perioodi",
  },
} as const;
