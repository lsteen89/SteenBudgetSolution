import type {
  DashboardPeriodHeaderSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";

/**
 * Pure resolver for the open-month CloseBand state (PR5).
 *
 * The CloseBand sits between MoneyState and AttentionLane in the Spine
 * dashboard. It is the only place on the dashboard that gives the close-month
 * lifecycle its own dedicated, calm-but-clear visual block. Its visibility and
 * tone are derived from inputs the dashboard already has:
 *
 *  - `header.periodStatus` (`open` / `closed` / `skipped`)
 *  - `header.lifecycleState` (`normal` / `upcoming` / `eligible` / `overdue`)
 *  - `header.canCloseMonth` (backend-authoritative gate for the close mutation)
 *  - `closeAvailability` (from `getCloseAvailabilityLabel` — already resolved
 *    elsewhere in the dashboard, so we never re-derive the countdown copy)
 *  - `remaining` (the backend-authoritative remaining amount; for open months
 *    this is `finalBalanceWithCarryMonthly`)
 *
 * Resolution rules (priority order):
 *
 *   1. Closed / skipped months → `absent`. Closed/skipped paths render their
 *      own surfaces upstream and must never show edit affordances here
 *      (handover § "Hard Constraints" item 5).
 *   2. `lifecycleState === "overdue"` → `overdue`. Danger treatment, includes
 *      a CTA only when the backend also reports `canCloseMonth` so we never
 *      offer a no-op close. An overdue lifecycle with `canCloseMonth=false`
 *      is an inconsistent backend state — we still surface the danger
 *      treatment but hide the CTA rather than offering one the backend will
 *      reject (mirrors the AttentionLane precedent).
 *   3. `lifecycleState === "eligible"` (or `closeAvailability.kind === "ready"`)
 *      → `eligible`. Accent treatment, CTA gated on `canCloseMonth`.
 *   4. `lifecycleState === "upcoming"` AND `closeAvailability.kind ===
 *      "countdown"` → `upcoming`. Quiet status with the countdown label
 *      already produced by `getCloseAvailabilityLabel`. The lifecycle gate
 *      is required because `getCloseAvailabilityLabel` happily returns a
 *      countdown even weeks out (any open month with a non-null
 *      `closeWindowOpensAt`), whereas the dashboard's "upcoming" treatment
 *      is the narrow last-stretch-before-close state owned by the backend's
 *      `lifecycleState`. Without this gate, calm mid-month dashboards would
 *      render a band, breaking the "calm/normal renders nothing" rule.
 *   5. Otherwise → `absent`. The lifecycle is calm/normal — the band stays
 *      out of the user's way.
 *
 * `carryForwardPreview` is `max(remaining, 0)` per the handover. Negative
 * `remaining` resolves to `0` because a deficit close does not carry debt
 * into the next month. The deficit tone is conveyed by `carryForwardTone =
 * "deficit"` so the consuming component can pick honest copy without
 * recomputing the sign.
 *
 * The resolver is fully pure and side-effect-free. All copy lives in the
 * CloseBand i18n dictionary; this module owns only the data shape and
 * decision tree so it can be unit-tested without rendering.
 */
export type CloseBandKind = "overdue" | "eligible" | "upcoming" | "absent";

export type CarryForwardTone = "positive" | "zero" | "deficit";

export interface CloseBandActiveState {
  /** Always-defined CTA gate. Tells the band whether to render the action. */
  canCloseMonth: boolean;
  /** `max(remaining, 0)` — the amount that would carry into the next month. */
  carryForwardPreview: number;
  /**
   * Tone for the preview copy. `deficit` means the underlying `remaining` was
   * negative (preview still clamps to 0); `zero` and `positive` follow the
   * sign of `remaining` directly.
   */
  carryForwardTone: CarryForwardTone;
}

export type CloseBandState =
  | ({ kind: "overdue" } & CloseBandActiveState)
  | ({ kind: "eligible" } & CloseBandActiveState)
  | ({
      kind: "upcoming";
      countdownLabel: string;
      carryForwardPreview: number;
      carryForwardTone: CarryForwardTone;
    })
  | { kind: "absent" };

type HeaderInput = Pick<
  DashboardPeriodHeaderSummary,
  "periodStatus" | "lifecycleState" | "canCloseMonth"
>;

export interface ResolveCloseBandStateInput {
  header: HeaderInput;
  closeAvailability: CloseAvailability;
  /**
   * Backend-authoritative remaining amount for the period
   * (`finalBalanceWithCarryMonthly` for open months). Pass the same value
   * MoneyState uses so the carry-forward preview never disagrees with the
   * anchor.
   */
  remaining: number;
}

const REMAINING_EPSILON = 0.005;

function resolveCarryForward(remaining: number): {
  carryForwardPreview: number;
  carryForwardTone: CarryForwardTone;
} {
  if (remaining > REMAINING_EPSILON) {
    return { carryForwardPreview: remaining, carryForwardTone: "positive" };
  }
  if (remaining < -REMAINING_EPSILON) {
    // Deficit: nothing carries over. Tone is "deficit" so the copy can be
    // honest about why the preview is 0.
    return { carryForwardPreview: 0, carryForwardTone: "deficit" };
  }
  return { carryForwardPreview: 0, carryForwardTone: "zero" };
}

export function resolveCloseBandState(
  input: ResolveCloseBandStateInput,
): CloseBandState {
  const { header, closeAvailability, remaining } = input;

  // 1. Closed / skipped — never render close affordances here.
  if (header.periodStatus !== "open") {
    return { kind: "absent" };
  }

  const carry = resolveCarryForward(remaining);

  // 2. Overdue. Render the danger treatment even when canCloseMonth is false
  // (inconsistent backend state), but only attach the CTA when the backend
  // also reports canCloseMonth.
  if (header.lifecycleState === "overdue") {
    return {
      kind: "overdue",
      canCloseMonth: header.canCloseMonth,
      ...carry,
    };
  }

  // 3. Eligible — backend says the close window is open. Accept either an
  // explicit eligible lifecycle state or a `ready` closeAvailability hint
  // (both come from the same backend signals via different resolvers and
  // should agree, but we cover both to avoid relying on a single field).
  if (
    header.lifecycleState === "eligible" ||
    closeAvailability.kind === "ready"
  ) {
    return {
      kind: "eligible",
      canCloseMonth: header.canCloseMonth,
      ...carry,
    };
  }

  // 4. Upcoming countdown — quiet status, no CTA. Requires BOTH the
  // backend's narrow "upcoming" lifecycle state AND a countdown from
  // getCloseAvailabilityLabel. The countdown alone is not enough:
  // getCloseAvailabilityLabel returns a countdown for every open month with
  // a future closeWindowOpensAt (often weeks out), but the band's "upcoming"
  // treatment is the close-window-is-near state. Gating on lifecycleState
  // keeps calm mid-month dashboards in the absent branch as the design
  // requires.
  if (
    header.lifecycleState === "upcoming" &&
    closeAvailability.kind === "countdown"
  ) {
    return {
      kind: "upcoming",
      countdownLabel: closeAvailability.label,
      carryForwardPreview: carry.carryForwardPreview,
      carryForwardTone: carry.carryForwardTone,
    };
  }

  // 5. Normal / quiet — the band stays out of the way.
  return { kind: "absent" };
}
