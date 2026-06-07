import type {
  DashboardSummary,
  HeaderLifecycleState,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";

/**
 * Client-derived attention ranking for the open-month dashboard (PR4).
 *
 * The ranking is intentionally **on-device guidance**, not backend-authored
 * financial advice (handover § "Hard Constraints" item 7). The dashboard
 * surfaces this honestly through the AttentionLane's "How these are chosen"
 * affordance.
 *
 * Inputs are pure: the existing `DashboardSummary` plus the existing
 * `CloseAvailability` resolver. No extra reads are performed. No transaction,
 * spend-progress, due-date or burn-rate concepts are introduced — this is a
 * budgeting product (handover § item 1).
 *
 * The result is capped at `MAX_ATTENTION_ITEMS` so the surface stays calm.
 * Severity tones are used only where the data justifies it; deficit copy is
 * factual, never shameful (handover § item 8).
 *
 * Each item carries:
 *   - a stable `id` for keying and analytics
 *   - a `severity` tone (critical | attention | info | positive)
 *   - i18n `titleKey` / `bodyKey` / `actionKey` (no hardcoded strings)
 *   - optional interpolation `values`
 *   - an `action` target the UI routes to (quick drawer, full editor,
 *     breakdown, or close flow)
 *
 * Closed/skipped months never reach this code path in production (the
 * dashboard renders different branches), but we still return `[]` defensively
 * so the helper is safe to call in tests and future contexts.
 */

export type AttentionSeverity = "critical" | "attention" | "info" | "positive";

export type AttentionPillar = "income" | "expenses" | "savings" | "debts";

export type AttentionActionTarget =
  | { kind: "close-month" }
  | { kind: "open-quick-drawer"; pillar: AttentionPillar }
  | { kind: "open-full-editor"; pillar: AttentionPillar }
  | { kind: "open-breakdown" };

export type AttentionItemId =
  | "overdue-close"
  | "deficit"
  | "eligible-close"
  | "close-countdown"
  | "no-savings-plan"
  | "subscriptions-pressure"
  | "debt-pressure"
  | "recurring-pressure"
  | "large-surplus"
  | "stable-plan";

export interface AttentionItem {
  id: AttentionItemId;
  severity: AttentionSeverity;
  titleKey: string;
  bodyKey: string;
  actionKey: string;
  values?: Record<string, string | number>;
  action: AttentionActionTarget;
}

export interface AttentionRankingInput {
  summary: DashboardSummary;
  closeAvailability: CloseAvailability;
}

export const MAX_ATTENTION_ITEMS = 3;

const SURPLUS_RATIO_THRESHOLD = 0.15;
const MONEY_EPSILON = 0.005;

/**
 * Rank attention items for the open-month dashboard.
 *
 * Priority intent (highest first):
 *   1. Overdue close — lifecycle pressure beats every financial item; the user
 *      is past the window, the recap is waiting on them.
 *   2. Deficit — money math is the dashboard's core question; a negative
 *      remaining trumps follow-ups that assume a healthy plan.
 *   3. Eligible-to-close — month is balanced and closing is available.
 *   4. Close countdown — quiet upcoming-close signal.
 *   5. No savings plan — savings literacy nudge when income > 0.
 *   6. Subscriptions pressure — recurring cost visibility.
 *   7. Debt-payment pressure — large planned debt service visibility.
 *   8. Recurring-expense visibility — non-subscription recurring items.
 *   9. Large surplus — actionable allocation prompt (positive tone).
 *
 * If nothing qualifies, returns a single calm "stable plan" positive item so
 * the lane never collapses to empty silence.
 */
export function rankAttentionItems(
  input: AttentionRankingInput,
): AttentionItem[] {
  const { summary } = input;
  if (summary.header.periodStatus !== "open") {
    return [];
  }

  const items: AttentionItem[] = [];

  // 1. Overdue close — lifecycle pressure beats financial items. The
  // item is only emitted when the backend also reports the month as
  // closeable (`canCloseMonth`), so the CTA never opens the close-month
  // flow against a month the backend refuses to close. An overdue
  // lifecycle state without `canCloseMonth` is an inconsistent backend
  // state; the lane stays silent on it rather than offering a no-op CTA.
  if (
    isOverdue(summary.header.lifecycleState) &&
    summary.header.canCloseMonth
  ) {
    items.push({
      id: "overdue-close",
      severity: "critical",
      titleKey: "itemOverdueTitle",
      bodyKey: "itemOverdueBody",
      actionKey: "itemOverdueAction",
      action: { kind: "close-month" },
    });
  }

  // 2. Deficit — factual, not shameful copy.
  const remaining = summary.finalBalance;
  if (remaining < -MONEY_EPSILON) {
    items.push({
      id: "deficit",
      severity: "critical",
      titleKey: "itemDeficitTitle",
      bodyKey: "itemDeficitBody",
      actionKey: "itemDeficitAction",
      action: { kind: "open-quick-drawer", pillar: "expenses" },
    });
  }

  // 3. Eligible close — non-overdue eligible state. Skip if already covered
  // by the overdue branch above.
  if (
    summary.header.lifecycleState === "eligible" &&
    summary.header.canCloseMonth
  ) {
    items.push({
      id: "eligible-close",
      severity: "attention",
      titleKey: "itemEligibleCloseTitle",
      bodyKey: "itemEligibleCloseBody",
      actionKey: "itemEligibleCloseAction",
      action: { kind: "close-month" },
    });
  }

  // 4. Close countdown — only when no close item already added.
  const hasCloseItem = items.some(
    (i) => i.id === "overdue-close" || i.id === "eligible-close",
  );
  if (!hasCloseItem && input.closeAvailability.kind === "countdown") {
    items.push({
      id: "close-countdown",
      severity: "info",
      titleKey: "itemCloseCountdownTitle",
      bodyKey: "itemCloseCountdownBody",
      actionKey: "itemCloseCountdownAction",
      values: { label: input.closeAvailability.label },
      action: { kind: "open-breakdown" },
    });
  }

  // 5. No savings plan when income exists.
  if (summary.totalSavings <= MONEY_EPSILON && summary.totalIncome > 0) {
    items.push({
      id: "no-savings-plan",
      severity: "info",
      titleKey: "itemNoSavingsTitle",
      bodyKey: "itemNoSavingsBody",
      actionKey: "itemNoSavingsAction",
      action: { kind: "open-quick-drawer", pillar: "savings" },
    });
  }

  // 6. Subscriptions pressure.
  if (summary.subscriptionsTotal > MONEY_EPSILON) {
    items.push({
      id: "subscriptions-pressure",
      severity: "info",
      titleKey: "itemSubscriptionsTitle",
      bodyKey: "itemSubscriptionsBody",
      actionKey: "itemSubscriptionsAction",
      values: {
        count: summary.subscriptionsCount,
      },
      action: { kind: "open-quick-drawer", pillar: "expenses" },
    });
  }

  // 7. Debt payment pressure.
  if (summary.totalDebtPayments > MONEY_EPSILON) {
    items.push({
      id: "debt-pressure",
      severity: "info",
      titleKey: "itemDebtPressureTitle",
      bodyKey: "itemDebtPressureBody",
      actionKey: "itemDebtPressureAction",
      action: { kind: "open-quick-drawer", pillar: "debts" },
    });
  }

  // 8. Non-subscription recurring expense visibility.
  // Only surface if there are recurring entries beyond the already-counted
  // subscriptions, so we avoid double-flagging the same data.
  const nonSubscriptionRecurring =
    summary.recurringExpenses.length - summary.subscriptionsCount;
  if (nonSubscriptionRecurring > 0) {
    items.push({
      id: "recurring-pressure",
      severity: "info",
      titleKey: "itemRecurringTitle",
      bodyKey: "itemRecurringBody",
      actionKey: "itemRecurringAction",
      values: { count: nonSubscriptionRecurring },
      action: { kind: "open-quick-drawer", pillar: "expenses" },
    });
  }

  // 9. Large unallocated surplus (positive). Only when remaining is healthy
  // and well above noise — not for a tiny rounding-leftover.
  if (
    remaining > MONEY_EPSILON &&
    summary.totalIncome > 0 &&
    remaining / summary.totalIncome >= SURPLUS_RATIO_THRESHOLD
  ) {
    items.push({
      id: "large-surplus",
      severity: "positive",
      titleKey: "itemLargeSurplusTitle",
      bodyKey: "itemLargeSurplusBody",
      actionKey: "itemLargeSurplusAction",
      action: { kind: "open-quick-drawer", pillar: "savings" },
    });
  }

  if (items.length === 0) {
    items.push({
      id: "stable-plan",
      severity: "positive",
      titleKey: "itemStablePlanTitle",
      bodyKey: "itemStablePlanBody",
      actionKey: "itemStablePlanAction",
      action: { kind: "open-breakdown" },
    });
  }

  return items.slice(0, MAX_ATTENTION_ITEMS);
}

function isOverdue(state: HeaderLifecycleState): boolean {
  return state === "overdue";
}
