export const debtMinimumRealityCardDict = {
  sv: {
    title: "Minimibetalningar",
    badge: "Baslinje",

    totalMinimum: "Totalt minimum",
    perMonthSuffix: "/mån",

    chipMinimum: "Minimum = alltid",
    chipExtra: "Extra = valfritt",

    footer:
      "Detta är din lägsta nivå. Extra betalningar kan minska skuldtiden rejält.",
  },

  en: {
    title: "Minimum payments",
    badge: "Baseline",

    totalMinimum: "Total minimum",
    perMonthSuffix: "/mo",

    chipMinimum: "Minimum = always",
    chipExtra: "Extra = optional",

    footer:
      "This is your lowest level. Extra payments can reduce the debt period a lot.",
  },

  et: {
    title: "Miinimummaksed",
    badge: "Baastase",

    totalMinimum: "Miinimum kokku",
    perMonthSuffix: "/kuu",

    chipMinimum: "Miinimum = alati",
    chipExtra: "Lisa = valikuline",

    footer:
      "See on sinu madalaim tase. Lisamaksed võivad võlaperioodi märgatavalt lühendada.",
  },
} as const;
