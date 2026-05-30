/**
 * Copy for a single income ledger row.
 *
 * Allowed exception pills (per designer handover):
 *   - `monthOnly`         → "Bara {month}"
 *   - `inactiveInMonth`   → "Inaktiv denna månad"
 *   - `changedInMonth`    → "Ändrad i {month}"   (PR 6 — wired only when the
 *                           backend source-plan fields say so)
 *
 * Banned copy enforced by the dictionary:
 *   no `Plan` / `Pausad` / `Avbruten` / `paused` / `cancelled` / subscription
 *   language. Income has no subscription lifecycle.
 */
export const incomeLedgerRowDict = {
  sv: {
    salaryDisplayName: "Nettolön",
    salaryMeta: "Månadslön efter skatt",
    recurringMeta: "Återkommande",
    pillMonthOnly: "Bara {month}",
    pillInactiveInMonth: "Inaktiv denna månad",
    pillChangedInMonth: "Ändrad i {month}",
    rowActionsOpen: "Öppna radåtgärder",
    rowActionsDisabled: "Åtgärder otillgängliga",
    actionEdit: "Redigera",
    actionDeactivateInMonth: "Inaktivera denna månad",
    actionActivateForMonth: "Aktivera för {month}",
    actionDeleteFromMonth: "Ta bort från {month}",
  },
  en: {
    salaryDisplayName: "Net salary",
    salaryMeta: "Monthly salary after tax",
    recurringMeta: "Recurring",
    pillMonthOnly: "{month} only",
    pillInactiveInMonth: "Inactive this month",
    pillChangedInMonth: "Changed in {month}",
    rowActionsOpen: "Open row actions",
    rowActionsDisabled: "Actions unavailable",
    actionEdit: "Edit",
    actionDeactivateInMonth: "Deactivate this month",
    actionActivateForMonth: "Activate for {month}",
    actionDeleteFromMonth: "Remove from {month}",
  },
  et: {
    salaryDisplayName: "Netopalk",
    salaryMeta: "Kuupalk pärast makse",
    recurringMeta: "Korduv",
    pillMonthOnly: "Ainult {month}",
    pillInactiveInMonth: "Sel kuul mitteaktiivne",
    pillChangedInMonth: "Muudetud kuus {month}",
    rowActionsOpen: "Ava rea toimingud",
    rowActionsDisabled: "Toimingud pole saadaval",
    actionEdit: "Muuda",
    actionDeactivateInMonth: "Deaktiveeri sel kuul",
    actionActivateForMonth: "Aktiveeri kuuks {month}",
    actionDeleteFromMonth: "Eemalda kuust {month}",
  },
} as const;
