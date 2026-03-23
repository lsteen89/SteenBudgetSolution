// Frontend/src/utils/i18n/wizard/stepExpenditure/HomeTypeOption.i18n.ts
export const homeTypeOptionDict = {
  sv: {
    rentLabel: "Månadshyra",
    brfLabel: "Månadsavgift",

    extraFeesLabel: "Extra avgifter (frivilligt)",

    hintIntroA: "Endast",
    hintIntroB: "obligatoriska boendeavgifter",
    hintIntroC: "kopplade till hyra/avgift.",

    hintParking: "• Parkering som betalas separat",
    hintInternet: "• Internet/TV som du kan välja själv",
    hintMandatory: "• Obligatorisk avgift från hyresvärd/BRF",

    hintTransport: "Transport",
    hintFixed: "Fasta utgifter",
    hintHere: "här",

    tooltipAria: "Info om extra avgifter",
    tooltipTitle: "Vad menas här?",
    tooltipBody:
      "Endast obligatoriska boendeavgifter kopplade till hyra/avgift. Inte internet, abonnemang eller parkering som betalas separat.",
  },

  en: {
    rentLabel: "Monthly rent",
    brfLabel: "Monthly fee",

    extraFeesLabel: "Extra fees (optional)",

    hintIntroA: "Only",
    hintIntroB: "mandatory housing fees",
    hintIntroC: "linked to rent/fee.",

    hintParking: "• Parking paid separately",
    hintInternet: "• Internet/TV you can choose yourself",
    hintMandatory: "• Mandatory fee from landlord/HOA",

    hintTransport: "Transport",
    hintFixed: "Fixed expenses",
    hintHere: "here",

    tooltipAria: "Info about extra fees",
    tooltipTitle: "What does this mean?",
    tooltipBody:
      "Only mandatory housing fees tied to rent/fee. Not internet, subscriptions, or parking paid separately.",
  },

  et: {
    rentLabel: "Kuuüür",
    brfLabel: "Kuutasu",

    extraFeesLabel: "Lisatasud (valikuline)",

    hintIntroA: "Ainult",
    hintIntroB: "kohustuslikud eluasemetasud",
    hintIntroC: "mis on seotud üüri/tasuga.",

    hintParking: "• Eraldi makstav parkimine",
    hintInternet: "• Internet/TV, mida saad ise valida",
    hintMandatory: "• Üürileandja/ühistu kohustuslik tasu",

    hintTransport: "Transport",
    hintFixed: "Püsikulud",
    hintHere: "siin",

    tooltipAria: "Lisatasude info",
    tooltipTitle: "Mida see tähendab?",
    tooltipBody:
      "Ainult kohustuslikud eluasemetasud, mis on seotud üüri/tasuga. Mitte internet, tellimused ega eraldi makstav parkimine.",
  },
} as const;
