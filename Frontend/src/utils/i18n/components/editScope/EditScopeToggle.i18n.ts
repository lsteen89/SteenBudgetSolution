/**
 * Copy for the EditScopeToggle primitive.
 *
 * The toggle expresses a deliberate distinction every money-edit flow needs to
 * make: is this change just for the current month, or does it update the
 * recurring budget plan going forward? User-facing copy intentionally avoids
 * technical words like "default" or "baseline".
 *
 * Reusable across the expense, income, savings and debt edit flows.
 */
export const editScopeToggleDict = {
  sv: {
    legend: "Vad ska ändringen gälla?",
    onlyThisMonth: "Gäller bara {month}",
    onlyThisMonthHelp:
      "Ändringen påverkar bara den här månaden. Budgetplanen är oförändrad.",
    updatePlanForward: "Uppdatera budgetplanen framåt",
    updatePlanForwardHelp:
      "Den nya nivån används från och med nästa månad och framåt.",
  },
  en: {
    legend: "What should this change apply to?",
    onlyThisMonth: "Only for {month}",
    onlyThisMonthHelp:
      "Applies just to this month. Your ongoing budget plan stays the same.",
    updatePlanForward: "Update the ongoing budget plan",
    updatePlanForwardHelp:
      "The new amount is used from next month onwards.",
  },
  et: {
    legend: "Mille kohta see muudatus kehtib?",
    onlyThisMonth: "Ainult kuus {month}",
    onlyThisMonthHelp:
      "Muudatus puudutab vaid seda kuud. Eelarveplaan jääb samaks.",
    updatePlanForward: "Uuenda jooksvat eelarveplaani",
    updatePlanForwardHelp:
      "Uus summa hakkab kehtima alates järgmisest kuust.",
  },
} as const;
