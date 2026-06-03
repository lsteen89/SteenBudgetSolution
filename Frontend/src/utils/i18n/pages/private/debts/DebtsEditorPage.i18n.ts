// Debt editor i18n dictionary. PR 6 adds the target-page shell strings
// (hero, balance strip, lifecycle groups, empty / read-only states,
// localized disabled-reason copy) on top of the original PR 0 keys for the
// planned-payment modal flow.
//
// Keep this dictionary in lockstep across `sv` / `en` / `et` — the build
// type-checks that the `en` and `et` shapes match `sv`, so adding a new key
// requires updating all three.

export const debtsEditorPageDict = {
  sv: {
    // ---------------------------------------------------------------- page
    loadingDebts: "Laddar skulder...",
    loadEditorError: "Kunde inte läsa in skuldredigeraren.",
    noOpenMonth: "Det finns ingen öppen månad att redigera.",
    title: "Hantera skulder",
    titleWithMonth: "Hantera skulder · {yearMonthLabel}",
    eyebrow: "Skulder",
    description:
      "Justera planerad månadsbetalning för dina skulder under {yearMonthLabel}.",
    readOnlyBadge: "Stängd månad · skrivskyddad",
    period: "Period",
    income: "Inkomster",
    expenses: "Utgifter",
    debts: "Skulder",
    remaining: "Kvar",

    // ---------------------------------------------------------------- hero
    heroEyebrow: "Skulder · {yearMonthLabel}",
    heroHeadline:
      "Du planerar att betala {amount} på skulder denna månad",
    heroHeadlineEmpty: "Du har inga aktiva skulder den här månaden",
    heroSplitLoan: "{amount} lån",
    heroSplitCredit: "{amount} kreditkort",
    heroSplitInstallment: "{amount} avbetalning",
    heroCta: "Lägg till skuld",
    heroCtaPendingPr: "Tillgängligt när tillägg av skuld kopplas in",
    heroSnapshotLabel: "Kvar att betala",
    heroBudgetRemaining: "{amount} kvar i budget",
    heroReadOnlyPill: "{yearMonthLabel} är avslutad — skrivskyddad",

    // -------------------------------------------------------- balance strip
    stripSectionLabel: "Skulder denna månad",
    stripHeadline: "{amount} i månadsbetalningar",
    stripMessage:
      "Månadsbetalningarna är planerade utbetalningar den här månaden. Saldot är en ögonblicksbild av hur mycket du är skyldig — det ändras bara när du uppdaterar saldot eller registrerar en faktisk betalning, inte när du justerar en planerad månadsbetalning.",
    stripZoneFlowLabel: "Påverkar månaden",
    stripZoneSnapshotLabel: "Ögonblicksbild",
    stripPaymentsLabel: "Månadsbetalningar",
    stripFreeAfterLabel: "Kvar efter inkomst, utgifter, sparande & skulder",
    stripBalanceLabel: "Kvar att betala — totalt",
    stripSnapshotNote:
      "Inkluderar skulder du hoppar över denna månad — de är fortfarande obetalda.",
    stripMeterCaption: "Så fördelas månadsbetalningarna",
    stripMeterLoan: "Lån",
    stripMeterCredit: "Kreditkort",
    stripMeterInstallment: "Avbetalning",

    // --------------------------------------------------------- ledger / row
    sectionTitle: "Skulder",
    rowsCountOne: "{count} skuld",
    rowsCountOther: "{count} skulder",
    total: "Totalt planerat",
    debt: "Skuld",
    balance: "Saldo",
    monthlyAmount: "Planerad betalning",
    rowActionsOpen: "Öppna radåtgärder",
    rowActionsDisabled: "Åtgärder otillgängliga",
    edit: "Justera planerad betalning",
    monthOnly: "Bara denna månad",
    monthOnlyHint: "Den här skulden finns bara i den här månaden.",
    empty: "Du har inga skulder den här månaden.",
    itemUpdated: "Planerad betalning sparades",
    itemUpdateError: "Planerad betalning kunde inte sparas",
    createSuccess: "Skulden lades till",
    createError: "Skulden kunde inte sparas",
    detailsSuccess: "Uppgifterna sparades",
    detailsError: "Uppgifterna kunde inte sparas",
    balanceUpdated: "Saldot uppdaterades",
    balanceUpdateError: "Saldot kunde inte uppdateras",
    readOnly: "Den här månaden är stängd och kan inte redigeras.",
    plannedNote:
      "Här ändras bara planerad månadsbetalning. Saldo uppdateras inte här.",

    // --------------------------------------------------------- group labels
    groupActiveTitle: "Betalas denna månad",
    groupActiveInsight: "Planerade utbetalningar som ingår i månaden.",
    groupActiveCountOne: "{count} skuld",
    groupActiveCountOther: "{count} skulder",
    groupSkippedTitle: "Ingår inte denna månad",
    groupSkippedInsight:
      "Pausade en månad. Skulden är inte stängd och saldot påverkas inte.",
    groupSkippedCountOne: "{count} skuld · saldot kvarstår",
    groupSkippedCountOther: "{count} skulder · saldot kvarstår",
    groupPaidTitle: "Betald · Avslutad",
    groupPaidInsight:
      "Färdigbetalda skulder. De räknas inte längre i månadens betalningar.",
    groupPaidCountOne: "{count} skuld",
    groupPaidCountOther: "{count} skulder",
    groupPaidSummary: "Slutbetald",
    groupArchivedTitle: "Arkiverad",
    groupArchivedInsight:
      "Dolda från den vanliga planeringen. Kan återställas när som helst.",
    groupArchivedCountOne: "{count} skuld · visas inte i planeringen",
    groupArchivedCountOther: "{count} skulder · visas inte i planeringen",
    groupArchivedExpand: "Visa arkiverade",
    groupArchivedCollapse: "Dölj arkiverade",

    // group head totals
    groupTotalPlannedLabel: "Planerat · per månad",
    groupTotalNotIncludedLabel: "Denna månad",
    groupTotalRemainingLabel: "Kvar att betala",

    // -------------------------------------------------- row column / badges
    rowsColBalance: "Kvar att betala",
    rowsColPayment: "Planerad · per månad",
    rowCellBalance: "Kvar att betala",
    rowCellPayment: "Planerad",
    rowMetaLoanLabel: "Lån",
    rowMetaCreditLabel: "Kreditkort",
    rowMetaInstallmentLabel: "Avbetalning",
    rowMetaApr: "ränta {value}",
    rowMetaMinPayment: "minst {value}",
    rowMetaFee: "avgift {value}/mån",
    rowMetaPlanPayment: "planen: {value}/mån",
    rowMetaSeparator: "·",
    rowBadgeMonthOnly: "Bara {yearMonthLabel}",
    rowBadgeSkipped: "Ingår inte i {yearMonthLabel}",
    rowBadgePaid: "Betald",
    rowEmptyPayment: "—",

    // ------------------------------------------------ inline repayment progress
    rowProgressPaid: "{percent} % minskat",
    rowProgressRemaining: "{remaining} kvar av {original}",

    // ------------------------------------------- Debt Polish PR 1: breakdown
    breakdownSectionLabel: "Så fördelas månadens betalning",
    breakdownInterestLabel: "Ränta",
    breakdownFeeLabel: "Avgift",
    breakdownPrincipalLabel: "Minskar skulden",
    breakdownProjectedAfterLabel: "Efter månaden",
    breakdownShortfallAdvisory:
      "Betalningen täcker inte ränta och avgift. Saldot väntas inte minska denna månad.",
    breakdownShortfallAmount: "Saknas: {amount}",
    stripBreakdownCaption: "Så fördelas månadens skuldbetalningar",
    stripBreakdownInterestLabel: "Ränta",
    stripBreakdownFeeLabel: "Avgift",
    stripBreakdownPrincipalLabel: "Minskar skulden",
    stripBreakdownProjectedLabel: "Beräknat saldo efter månaden",
    stripBreakdownShortfallOne:
      "{count} skuld täcker inte ränta och avgift den här månaden",
    stripBreakdownShortfallOther:
      "{count} skulder täcker inte ränta och avgift den här månaden",

    // ---------------------------------------------- row action menu copy
    rowActionEditPayment: "Redigera planerad betalning",
    rowActionUpdateBalance: "Uppdatera saldo",
    rowActionViewProgress: "Visa återbetalningsförlopp",
    rowActionEditDetails: "Redigera uppgifter",
    rowActionSkip: "Hoppa över denna månad",
    rowActionInclude: "Inkludera denna månad",
    rowActionMarkPaid: "Markera som betald",
    rowActionArchive: "Arkivera",
    rowActionRestore: "Återställ skuld",
    rowActionRemove: "Ta bort",
    rowActionPendingPrHint: "Tillgängligt när åtgärden kopplas in",

    // ----------------------------------------- lifecycle confirmation dialog
    lifecycleConfirmCancel: "Avbryt",
    lifecycleConfirmWorking: "Sparar...",
    lifecycleSkipTitle: "Hoppa över denna månad?",
    lifecycleSkipBody:
      "{name} räknas inte i {yearMonthLabel}s betalningar. Saldot står kvar — du är fortfarande skyldig beloppet. Planen och skulden påverkas inte, och du kan inkludera den igen när som helst.",
    lifecycleSkipPrimary: "Hoppa över",
    lifecycleIncludeTitle: "Inkludera denna månad igen?",
    lifecycleIncludeBody:
      "{name} räknas igen i {yearMonthLabel}s betalningar. Saldot är oförändrat.",
    lifecycleIncludePrimary: "Inkludera",
    lifecyclePaidTitle: "Markera som betald?",
    lifecyclePaidBody:
      "{name} flyttas till Betald · Avslutad och räknas inte längre i månadens betalningar. Framtida planerade betalningar stoppas. Det här ändrar bara status — ingen faktisk betalning registreras.",
    lifecyclePaidPrimary: "Markera som betald",
    lifecyclePaidZeroLabel: "Sätt saldot till 0 kr",
    lifecyclePaidZeroHint:
      "Uppdaterar saldot som en rättelse — inte en registrerad betalning.",
    lifecycleArchiveTitle: "Arkivera skuld?",
    lifecycleArchiveBody:
      "{name} döljs från den vanliga planeringen och räknas inte längre i månadens betalningar. Historiken sparas och du kan återställa skulden när som helst.",
    lifecycleArchivePrimary: "Arkivera",
    lifecycleRestoreTitle: "Återställ skuld?",
    lifecycleRestoreBody:
      "{name} blir aktiv igen och kan ingå i kommande månader. Historiken är oförändrad.",
    lifecycleRestorePrimary: "Återställ",
    lifecycleRestoreReincludeLabel: "Inkludera i {yearMonthLabel} igen",
    lifecycleRestoreReincludeHint:
      "Lägger tillbaka den planerade betalningen i {yearMonthLabel}.",
    lifecycleRemoveTitle: "Ta bort skuld?",
    lifecycleRemoveBody:
      "{name} tas bort från {yearMonthLabel} och räknas inte längre i månadens betalningar. Den här posten finns bara i den här månaden, så den påverkar inte planen framåt.",
    lifecycleRemovePrimary: "Ta bort",
    lifecycleSkipSuccess: "Skulden hoppades över denna månad",
    lifecycleIncludeSuccess: "Skulden inkluderades igen",
    lifecyclePaidSuccess: "Skulden markerades som betald",
    lifecycleArchiveSuccess: "Skulden arkiverades",
    lifecycleRestoreSuccess: "Skulden återställdes",
    lifecycleRemoveSuccess: "Skulden togs bort",
    lifecycleError: "Åtgärden kunde inte slutföras",

    // ------------------------------------------ disabled-reason copy (codes)
    reasonMonthClosed: "Månaden är avslutad — den här åtgärden är låst.",
    reasonMonthSkipped: "Månaden är överhoppad — den här åtgärden är låst.",
    reasonRowRemoved: "Posten är borttagen från månaden.",
    reasonRowDeleted: "Posten är borttagen.",
    reasonRowClosed: "Posten är låst.",
    reasonMonthOnlyNoPlan:
      "Den här skulden finns bara i månaden — planinställningar kan inte ändras.",
    reasonSourceMissing: "Den kopplade planposten saknas.",
    reasonSourcePaidOff: "Skulden är markerad som betald.",
    reasonSourceArchived: "Skulden är arkiverad.",
    reasonSourceDeleted: "Skulden är borttagen.",
    reasonAlreadyIncluded: "Skulden ingår redan denna månad.",
    reasonAlreadyNotIncluded: "Skulden ingår inte denna månad.",
    reasonSourceLinkedHistoryExists:
      "Skulden har historik — arkivera istället för att ta bort.",

    // -------------------------------------------------------- read-only note
    readOnlyBanner:
      "{yearMonthLabel} är avslutad. Du kan se skuldernas historik men inte ändra något. Öppna en aktiv månad för att redigera.",
    emptyHeading: "Inga skulder den här månaden",
    emptyBody:
      "När du lägger till en skuld visas den här — med saldo, ränta, planerad månadsbetalning och återbetalningsförlopp. Allt på ett lugnt och tydligt ställe.",
  },

  en: {
    loadingDebts: "Loading debts...",
    loadEditorError: "Could not load the debts editor.",
    noOpenMonth: "There is no open month to edit.",
    title: "Manage debts",
    titleWithMonth: "Manage debts · {yearMonthLabel}",
    eyebrow: "Debts",
    description:
      "Adjust the planned monthly payment for your debts in {yearMonthLabel}.",
    readOnlyBadge: "Closed month · read only",
    period: "Period",
    income: "Income",
    expenses: "Expenses",
    debts: "Debts",
    remaining: "Remaining",

    heroEyebrow: "Debts · {yearMonthLabel}",
    heroHeadline:
      "You plan to pay {amount} toward debts this month",
    heroHeadlineEmpty: "No active debts this month",
    heroSplitLoan: "{amount} loan",
    heroSplitCredit: "{amount} credit card",
    heroSplitInstallment: "{amount} installment",
    heroCta: "Add debt",
    heroCtaPendingPr: "Available once add-debt wiring ships",
    heroSnapshotLabel: "Owed balance",
    heroBudgetRemaining: "{amount} left in budget",
    heroReadOnlyPill: "{yearMonthLabel} is closed — read only",

    stripSectionLabel: "Debts this month",
    stripHeadline: "{amount} in monthly payments",
    stripMessage:
      "Monthly payments are planned outflows for this month. The owed balance is a snapshot of what you still owe — it only changes when you update the balance or record an actual payment, not when you change a planned monthly payment.",
    stripZoneFlowLabel: "Affects the month",
    stripZoneSnapshotLabel: "Snapshot",
    stripPaymentsLabel: "Monthly payments",
    stripFreeAfterLabel: "Remaining after income, expenses, savings & debts",
    stripBalanceLabel: "Owed balance — total",
    stripSnapshotNote:
      "Includes debts you are skipping this month — they are still owed.",
    stripMeterCaption: "How payments split by type",
    stripMeterLoan: "Loan",
    stripMeterCredit: "Credit card",
    stripMeterInstallment: "Installment",

    sectionTitle: "Debts",
    rowsCountOne: "{count} debt",
    rowsCountOther: "{count} debts",
    total: "Total planned",
    debt: "Debt",
    balance: "Balance",
    monthlyAmount: "Planned payment",
    rowActionsOpen: "Open row actions",
    rowActionsDisabled: "Actions unavailable",
    edit: "Adjust planned payment",
    monthOnly: "This month only",
    monthOnlyHint: "This debt only exists in the current month.",
    empty: "You have no debts this month.",
    itemUpdated: "Planned payment saved",
    itemUpdateError: "Could not save planned payment",
    createSuccess: "Debt added",
    createError: "Could not save the debt",
    detailsSuccess: "Details saved",
    detailsError: "Could not save the details",
    balanceUpdated: "Balance updated",
    balanceUpdateError: "Could not update the balance",
    readOnly: "This month is closed and cannot be edited.",
    plannedNote:
      "Only the planned monthly payment changes here. Balances are not updated by this flow.",

    groupActiveTitle: "Paid this month",
    groupActiveInsight: "Planned outflows that count toward this month.",
    groupActiveCountOne: "{count} debt",
    groupActiveCountOther: "{count} debts",
    groupSkippedTitle: "Not included this month",
    groupSkippedInsight:
      "Paused for a month. The debt is not closed and the balance is unchanged.",
    groupSkippedCountOne: "{count} debt · balance remains",
    groupSkippedCountOther: "{count} debts · balance remains",
    groupPaidTitle: "Paid off · Completed",
    groupPaidInsight:
      "Fully paid debts. They no longer count in this month's payments.",
    groupPaidCountOne: "{count} debt",
    groupPaidCountOther: "{count} debts",
    groupPaidSummary: "Paid off",
    groupArchivedTitle: "Archived",
    groupArchivedInsight:
      "Hidden from normal planning. Can be restored at any time.",
    groupArchivedCountOne: "{count} debt · hidden from planning",
    groupArchivedCountOther: "{count} debts · hidden from planning",
    groupArchivedExpand: "Show archived",
    groupArchivedCollapse: "Hide archived",

    groupTotalPlannedLabel: "Planned · per month",
    groupTotalNotIncludedLabel: "This month",
    groupTotalRemainingLabel: "Owed balance",

    rowsColBalance: "Owed balance",
    rowsColPayment: "Planned · per month",
    rowCellBalance: "Owed balance",
    rowCellPayment: "Planned",
    rowMetaLoanLabel: "Loan",
    rowMetaCreditLabel: "Credit card",
    rowMetaInstallmentLabel: "Installment",
    rowMetaApr: "rate {value}",
    rowMetaMinPayment: "min {value}",
    rowMetaFee: "fee {value}/mo",
    rowMetaPlanPayment: "plan: {value}/mo",
    rowMetaSeparator: "·",
    rowBadgeMonthOnly: "Only {yearMonthLabel}",
    rowBadgeSkipped: "Not in {yearMonthLabel}",
    rowBadgePaid: "Paid off",
    rowEmptyPayment: "—",

    rowProgressPaid: "{percent}% reduced",
    rowProgressRemaining: "{remaining} left of {original}",

    breakdownSectionLabel: "How this month's payment splits",
    breakdownInterestLabel: "Interest",
    breakdownFeeLabel: "Fee",
    breakdownPrincipalLabel: "Reduces balance",
    breakdownProjectedAfterLabel: "After this month",
    breakdownShortfallAdvisory:
      "The payment does not cover interest and fee. The balance is not expected to shrink this month.",
    breakdownShortfallAmount: "Missing: {amount}",
    stripBreakdownCaption: "How this month's debt payments split",
    stripBreakdownInterestLabel: "Interest",
    stripBreakdownFeeLabel: "Fee",
    stripBreakdownPrincipalLabel: "Reduces balance",
    stripBreakdownProjectedLabel: "Projected balance after this month",
    stripBreakdownShortfallOne:
      "{count} debt does not cover interest and fee this month",
    stripBreakdownShortfallOther:
      "{count} debts do not cover interest and fee this month",

    rowActionEditPayment: "Adjust planned payment",
    rowActionUpdateBalance: "Update balance",
    rowActionViewProgress: "View repayment progress",
    rowActionEditDetails: "Edit details",
    rowActionSkip: "Skip this month",
    rowActionInclude: "Include this month",
    rowActionMarkPaid: "Mark as paid off",
    rowActionArchive: "Archive",
    rowActionRestore: "Restore debt",
    rowActionRemove: "Remove",
    rowActionPendingPrHint: "Available once the action is wired",

    lifecycleConfirmCancel: "Cancel",
    lifecycleConfirmWorking: "Saving...",
    lifecycleSkipTitle: "Skip this month?",
    lifecycleSkipBody:
      "{name} will not count toward {yearMonthLabel}'s payments. The balance stays — you still owe the amount. The plan and the debt are untouched, and you can include it again at any time.",
    lifecycleSkipPrimary: "Skip",
    lifecycleIncludeTitle: "Include this month again?",
    lifecycleIncludeBody:
      "{name} counts toward {yearMonthLabel}'s payments again. The balance is unchanged.",
    lifecycleIncludePrimary: "Include",
    lifecyclePaidTitle: "Mark as paid off?",
    lifecyclePaidBody:
      "{name} moves to Paid off · Completed and no longer counts in this month's payments. Future planned payments stop. This only changes the status — no actual payment is recorded.",
    lifecyclePaidPrimary: "Mark as paid off",
    lifecyclePaidZeroLabel: "Set the balance to 0",
    lifecyclePaidZeroHint:
      "Updates the balance as a correction — not a recorded payment.",
    lifecycleArchiveTitle: "Archive debt?",
    lifecycleArchiveBody:
      "{name} is hidden from normal planning and no longer counts in this month's payments. The history is kept and you can restore the debt at any time.",
    lifecycleArchivePrimary: "Archive",
    lifecycleRestoreTitle: "Restore debt?",
    lifecycleRestoreBody:
      "{name} becomes active again and can be part of upcoming months. The history is unchanged.",
    lifecycleRestorePrimary: "Restore",
    lifecycleRestoreReincludeLabel: "Include in {yearMonthLabel} again",
    lifecycleRestoreReincludeHint:
      "Adds the planned payment back into {yearMonthLabel}.",
    lifecycleRemoveTitle: "Remove debt?",
    lifecycleRemoveBody:
      "{name} is removed from {yearMonthLabel} and no longer counts in this month's payments. This entry only exists in this month, so it does not affect the plan going forward.",
    lifecycleRemovePrimary: "Remove",
    lifecycleSkipSuccess: "Debt skipped this month",
    lifecycleIncludeSuccess: "Debt included again",
    lifecyclePaidSuccess: "Debt marked as paid off",
    lifecycleArchiveSuccess: "Debt archived",
    lifecycleRestoreSuccess: "Debt restored",
    lifecycleRemoveSuccess: "Debt removed",
    lifecycleError: "Could not complete the action",

    reasonMonthClosed: "The month is closed — this action is locked.",
    reasonMonthSkipped: "The month was skipped — this action is locked.",
    reasonRowRemoved: "The row has been removed from this month.",
    reasonRowDeleted: "The row has been removed.",
    reasonRowClosed: "The row is locked.",
    reasonMonthOnlyNoPlan:
      "This debt only exists in the current month — plan settings cannot be changed.",
    reasonSourceMissing: "The linked plan row is missing.",
    reasonSourcePaidOff: "The debt is marked as paid off.",
    reasonSourceArchived: "The debt is archived.",
    reasonSourceDeleted: "The debt has been removed.",
    reasonAlreadyIncluded: "The debt already counts this month.",
    reasonAlreadyNotIncluded: "The debt does not count this month.",
    reasonSourceLinkedHistoryExists:
      "The debt has history — archive instead of removing.",

    readOnlyBanner:
      "{yearMonthLabel} is closed. You can review the debts history but not change anything. Open an active month to edit.",
    emptyHeading: "No debts this month",
    emptyBody:
      "When you add a debt it shows up here — with balance, rate, planned monthly payment, and repayment progress. All in one calm place.",
  },

  et: {
    loadingDebts: "Võlgade laadimine...",
    loadEditorError: "Võlgade muutjat ei saanud laadida.",
    noOpenMonth: "Muudetavat avatud kuud ei ole.",
    title: "Halda võlgu",
    titleWithMonth: "Halda võlgu · {yearMonthLabel}",
    eyebrow: "Võlad",
    description:
      "Kohanda võlgade planeeritud kuumakset perioodil {yearMonthLabel}.",
    readOnlyBadge: "Suletud kuu · ainult vaatamiseks",
    period: "Periood",
    income: "Tulu",
    expenses: "Kulud",
    debts: "Võlad",
    remaining: "Alles",

    heroEyebrow: "Võlad · {yearMonthLabel}",
    heroHeadline: "Plaanid sel kuul tasuda võlgu kokku {amount}",
    heroHeadlineEmpty: "Sellel kuul aktiivseid võlgu ei ole",
    heroSplitLoan: "{amount} laenu",
    heroSplitCredit: "{amount} krediitkaart",
    heroSplitInstallment: "{amount} järelmaksu",
    heroCta: "Lisa võlg",
    heroCtaPendingPr: "Saadaval, kui lisamise voog on ühendatud",
    heroSnapshotLabel: "Tasumata jääk",
    heroBudgetRemaining: "{amount} eelarvesse alles",
    heroReadOnlyPill: "{yearMonthLabel} on suletud — ainult vaatamiseks",

    stripSectionLabel: "Võlad sel kuul",
    stripHeadline: "{amount} kuumakseteks",
    stripMessage:
      "Kuumaksed on sel kuul planeeritud väljaminekud. Jääk on hetkeolukord võlast — see muutub ainult siis, kui uuendad jääki või kannad sisse tegeliku makse, mitte siis, kui muudad planeeritud makset.",
    stripZoneFlowLabel: "Mõjutab kuud",
    stripZoneSnapshotLabel: "Hetkeolukord",
    stripPaymentsLabel: "Kuumaksed",
    stripFreeAfterLabel: "Alles pärast tulu, kulu, säästu ja võlgu",
    stripBalanceLabel: "Tasumata jääk — kokku",
    stripSnapshotNote:
      "Sisaldab võlgu, mille sa sel kuul vahele jätad — need on endiselt tasumata.",
    stripMeterCaption: "Kuidas maksed liikide vahel jagunevad",
    stripMeterLoan: "Laen",
    stripMeterCredit: "Krediitkaart",
    stripMeterInstallment: "Järelmaks",

    sectionTitle: "Võlad",
    rowsCountOne: "{count} võlg",
    rowsCountOther: "{count} võlga",
    total: "Kokku planeeritud",
    debt: "Võlg",
    balance: "Jääk",
    monthlyAmount: "Planeeritud makse",
    rowActionsOpen: "Ava rea toimingud",
    rowActionsDisabled: "Toimingud pole saadaval",
    edit: "Kohanda planeeritud makset",
    monthOnly: "Ainult see kuu",
    monthOnlyHint: "See võlg on olemas ainult selles kuus.",
    empty: "Sellel kuul võlgu ei ole.",
    itemUpdated: "Planeeritud makse salvestatud",
    itemUpdateError: "Planeeritud makse salvestamine ebaõnnestus",
    createSuccess: "Võlg lisatud",
    createError: "Võlga ei saanud salvestada",
    detailsSuccess: "Andmed salvestatud",
    detailsError: "Andmeid ei saanud salvestada",
    balanceUpdated: "Jääk uuendatud",
    balanceUpdateError: "Jääki ei saanud uuendada",
    readOnly: "See kuu on suletud ja seda ei saa muuta.",
    plannedNote:
      "Siin muudetakse ainult planeeritud kuumakset. Jääki see vaade ei uuenda.",

    groupActiveTitle: "Tasutakse sel kuul",
    groupActiveInsight: "Planeeritud väljaminekud, mis kuusse kuuluvad.",
    groupActiveCountOne: "{count} võlg",
    groupActiveCountOther: "{count} võlga",
    groupSkippedTitle: "Ei kuulu sel kuul",
    groupSkippedInsight:
      "Üheks kuuks peatatud. Võlg ei ole lõpetatud ja jääk ei muutu.",
    groupSkippedCountOne: "{count} võlg · jääk püsib",
    groupSkippedCountOther: "{count} võlga · jääk püsib",
    groupPaidTitle: "Tasutud · Lõpetatud",
    groupPaidInsight:
      "Täielikult tasutud võlad. Nad ei loe enam kuu maksetes.",
    groupPaidCountOne: "{count} võlg",
    groupPaidCountOther: "{count} võlga",
    groupPaidSummary: "Tasutud",
    groupArchivedTitle: "Arhiveeritud",
    groupArchivedInsight:
      "Peidetud tavaplaneerimisest. Saab igal ajal taastada.",
    groupArchivedCountOne: "{count} võlg · planeerimises peidetud",
    groupArchivedCountOther: "{count} võlga · planeerimises peidetud",
    groupArchivedExpand: "Näita arhiveeritud",
    groupArchivedCollapse: "Peida arhiveeritud",

    groupTotalPlannedLabel: "Planeeritud · kuus",
    groupTotalNotIncludedLabel: "Sel kuul",
    groupTotalRemainingLabel: "Tasumata jääk",

    rowsColBalance: "Tasumata jääk",
    rowsColPayment: "Planeeritud · kuus",
    rowCellBalance: "Tasumata jääk",
    rowCellPayment: "Planeeritud",
    rowMetaLoanLabel: "Laen",
    rowMetaCreditLabel: "Krediitkaart",
    rowMetaInstallmentLabel: "Järelmaks",
    rowMetaApr: "intress {value}",
    rowMetaMinPayment: "min {value}",
    rowMetaFee: "tasu {value}/kuus",
    rowMetaPlanPayment: "plaan: {value}/kuus",
    rowMetaSeparator: "·",
    rowBadgeMonthOnly: "Ainult {yearMonthLabel}",
    rowBadgeSkipped: "Ei kuulu {yearMonthLabel}",
    rowBadgePaid: "Tasutud",
    rowEmptyPayment: "—",

    rowProgressPaid: "{percent}% vähenenud",
    rowProgressRemaining: "{remaining} alles, kokku {original}",

    breakdownSectionLabel: "Kuidas kuumakse jaguneb",
    breakdownInterestLabel: "Intress",
    breakdownFeeLabel: "Tasu",
    breakdownPrincipalLabel: "Vähendab võlga",
    breakdownProjectedAfterLabel: "Pärast seda kuud",
    breakdownShortfallAdvisory:
      "Makse ei kata intressi ja tasu. Jääk ei eelda sel kuul vähenemist.",
    breakdownShortfallAmount: "Puudu: {amount}",
    stripBreakdownCaption: "Kuidas selle kuu võlamaksed jagunevad",
    stripBreakdownInterestLabel: "Intress",
    stripBreakdownFeeLabel: "Tasu",
    stripBreakdownPrincipalLabel: "Vähendab võlga",
    stripBreakdownProjectedLabel: "Eeldatav jääk pärast kuud",
    stripBreakdownShortfallOne:
      "{count} võlg ei kata sel kuul intressi ja tasu",
    stripBreakdownShortfallOther:
      "{count} võlga ei kata sel kuul intressi ja tasu",

    rowActionEditPayment: "Kohanda planeeritud makset",
    rowActionUpdateBalance: "Uuenda jääki",
    rowActionViewProgress: "Vaata tasumise käiku",
    rowActionEditDetails: "Muuda andmeid",
    rowActionSkip: "Jäta see kuu vahele",
    rowActionInclude: "Lisa sel kuul",
    rowActionMarkPaid: "Märgi tasutuks",
    rowActionArchive: "Arhiveeri",
    rowActionRestore: "Taasta võlg",
    rowActionRemove: "Eemalda",
    rowActionPendingPrHint: "Saadaval, kui toiming on ühendatud",

    lifecycleConfirmCancel: "Tühista",
    lifecycleConfirmWorking: "Salvestan...",
    lifecycleSkipTitle: "Jätta see kuu vahele?",
    lifecycleSkipBody:
      "{name} ei lähe arvesse {yearMonthLabel} maksetes. Jääk püsib — sa võlgned summa endiselt. Plaan ja võlg jäävad puutumata ning saad selle igal ajal uuesti lisada.",
    lifecycleSkipPrimary: "Jäta vahele",
    lifecycleIncludeTitle: "Lisada see kuu uuesti?",
    lifecycleIncludeBody:
      "{name} läheb taas arvesse {yearMonthLabel} maksetes. Jääk on muutmata.",
    lifecycleIncludePrimary: "Lisa",
    lifecyclePaidTitle: "Märkida tasutuks?",
    lifecyclePaidBody:
      "{name} liigub kategooriasse Tasutud · Lõpetatud ega lähe enam arvesse selle kuu maksetes. Tulevased planeeritud maksed peatatakse. See muudab ainult olekut — tegelikku makset ei registreerita.",
    lifecyclePaidPrimary: "Märgi tasutuks",
    lifecyclePaidZeroLabel: "Määra jääk 0-le",
    lifecyclePaidZeroHint:
      "Uuendab jääki parandusena — mitte registreeritud maksena.",
    lifecycleArchiveTitle: "Arhiveerida võlg?",
    lifecycleArchiveBody:
      "{name} peidetakse tavaplaneerimisest ega lähe enam arvesse selle kuu maksetes. Ajalugu säilib ja saad võla igal ajal taastada.",
    lifecycleArchivePrimary: "Arhiveeri",
    lifecycleRestoreTitle: "Taastada võlg?",
    lifecycleRestoreBody:
      "{name} muutub taas aktiivseks ja võib kuuluda tulevastesse kuudesse. Ajalugu on muutmata.",
    lifecycleRestorePrimary: "Taasta",
    lifecycleRestoreReincludeLabel: "Lisa {yearMonthLabel} uuesti",
    lifecycleRestoreReincludeHint:
      "Lisab planeeritud makse tagasi perioodi {yearMonthLabel}.",
    lifecycleRemoveTitle: "Eemaldada võlg?",
    lifecycleRemoveBody:
      "{name} eemaldatakse perioodist {yearMonthLabel} ega lähe enam arvesse selle kuu maksetes. See kirje on olemas ainult selles kuus, seega ei mõjuta see edasist plaani.",
    lifecycleRemovePrimary: "Eemalda",
    lifecycleSkipSuccess: "Võlg jäeti sel kuul vahele",
    lifecycleIncludeSuccess: "Võlg lisati uuesti",
    lifecyclePaidSuccess: "Võlg märgiti tasutuks",
    lifecycleArchiveSuccess: "Võlg arhiveeriti",
    lifecycleRestoreSuccess: "Võlg taastati",
    lifecycleRemoveSuccess: "Võlg eemaldati",
    lifecycleError: "Toimingut ei saanud lõpule viia",

    reasonMonthClosed: "Kuu on suletud — see toiming on lukus.",
    reasonMonthSkipped: "Kuu jäeti vahele — see toiming on lukus.",
    reasonRowRemoved: "Rida on sellest kuust eemaldatud.",
    reasonRowDeleted: "Rida on eemaldatud.",
    reasonRowClosed: "Rida on lukus.",
    reasonMonthOnlyNoPlan:
      "See võlg on olemas ainult selles kuus — plaani sätteid ei saa muuta.",
    reasonSourceMissing: "Seotud plaani rida on puudu.",
    reasonSourcePaidOff: "Võlg on märgitud tasutuks.",
    reasonSourceArchived: "Võlg on arhiveeritud.",
    reasonSourceDeleted: "Võlg on eemaldatud.",
    reasonAlreadyIncluded: "Võlg on juba sel kuul arvestatud.",
    reasonAlreadyNotIncluded: "Võlg ei ole sel kuul arvestatud.",
    reasonSourceLinkedHistoryExists:
      "Võlal on ajalugu — eemaldamise asemel arhiveeri.",

    readOnlyBanner:
      "{yearMonthLabel} on suletud. Saad vaadata võlgade ajalugu, kuid mitte muuta. Muutmiseks ava aktiivne kuu.",
    emptyHeading: "Sellel kuul võlgu ei ole",
    emptyBody:
      "Kui lisad võla, ilmub see siia — jäägi, intressi, planeeritud kuumakse ja tasumise käiguga. Kõik ühes rahulikus kohas.",
  },
} as const;
