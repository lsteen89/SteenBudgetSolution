/**
 * Copy for a single income ledger row.
 *
 * Allowed exception pills (per designer handover):
 *   - `monthOnly`        → "Bara {month}"
 *   - `inactiveInMonth`  → "Inaktiv denna månad"
 *
 * `Ändrad i {month}` is intentionally absent until PR 5 exposes the backend
 * source-plan fields and PR 6 wires the comparison. Do not add the key here
 * before then; missing keys are caught by the income editor i18n test.
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
    rowActionsOpen: "Ava rea toimingud",
    rowActionsDisabled: "Toimingud pole saadaval",
    actionEdit: "Muuda",
    actionDeactivateInMonth: "Deaktiveeri sel kuul",
    actionActivateForMonth: "Aktiveeri kuuks {month}",
    actionDeleteFromMonth: "Eemalda kuust {month}",
  },
} as const;
