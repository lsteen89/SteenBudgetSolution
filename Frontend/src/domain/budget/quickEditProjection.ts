import type { DashboardTerms } from "./dashboardTerms";

/**
 * Quick Edit projection math.
 *
 * The Quick Edit drawer shows a "free this month" preview while the user
 * edits one domain at a time. We project the dashboard's authoritative
 * `remaining` forward by the active domain's draft delta, without ever
 * recomputing the dashboard's other terms.
 *
 * Equation, six terms with explicit carry-over:
 *
 *   baseFree     = income + carryOver − expenses − savings − debts
 *   projectedFree = baseFree + sign(domain) × (draftDomainTotal − baseDomainTotal)
 *
 * Signs:
 *   income  : +1
 *   expenses: −1
 *   savings : −1
 *   debts   : −1
 *
 * `baseFree` is taken from `DashboardTerms.remaining` so the displayed value
 * never disagrees with the dashboard. The projection only adds a delta on top
 * of that — it does not re-derive the other terms.
 *
 * Pure functions, no React, no I/O. Cross-domain saves are not represented
 * here on purpose: PR B keeps the active-tab-save contract from PR A.
 */
export type QuickEditDomain = "income" | "expenses" | "savings" | "debts";

export const QUICK_EDIT_DOMAIN_SIGN: Record<QuickEditDomain, 1 | -1> = {
  income: 1,
  expenses: -1,
  savings: -1,
  debts: -1,
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num0 = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/**
 * Returns the dashboard's authoritative "free this month" value as
 * surfaced through `DashboardTerms.remaining`. This intentionally matches
 * the dashboard's displayed number rather than re-deriving the sum from the
 * five other terms; backend rounding stays the source of truth.
 */
export function quickEditBaseFree(terms: DashboardTerms): number {
  return round2(num0(terms.remaining));
}

/**
 * Returns the active-domain draft delta, expressed in the same sign
 * convention as `projectedFree − baseFree`:
 *
 *   + income increase  → positive (more free money)
 *   + expense increase → negative (less free money)
 *   + savings increase → negative
 *   + debt increase    → negative
 *
 * Returns 0 when there is no active domain (caller chooses to render no
 * arrow).
 */
export function quickEditProjectedDelta(
  domain: QuickEditDomain,
  baseDomainTotal: number,
  draftDomainTotal: number,
): number {
  const sign = QUICK_EDIT_DOMAIN_SIGN[domain];
  return round2(sign * (num0(draftDomainTotal) - num0(baseDomainTotal)));
}

/**
 * Returns the projected "free this month" after the active domain's draft
 * is applied. Other terms are taken from the dashboard unchanged — they are
 * not re-derived from drafts, which keeps the projection honest for
 * active-tab save and avoids implying a cross-domain transaction.
 */
export function quickEditProjectedFree(
  terms: DashboardTerms,
  domain: QuickEditDomain,
  baseDomainTotal: number,
  draftDomainTotal: number,
): number {
  return round2(
    quickEditBaseFree(terms) +
      quickEditProjectedDelta(domain, baseDomainTotal, draftDomainTotal),
  );
}
