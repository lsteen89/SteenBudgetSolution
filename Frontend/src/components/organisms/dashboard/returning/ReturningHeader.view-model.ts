import type {
  BudgetPeriodStatus,
  HeaderLifecycleState,
} from "@/hooks/dashboard/dashboardSummary.types";

export type ReturningHeaderStatusTone =
  | "open"
  | "overdue"
  | "closed"
  | "skipped";

export type ReturningHeaderPrimaryAction = "close" | "next" | "lockedNext";

export type ReturningHeaderViewModel = {
  statusTone: ReturningHeaderStatusTone;
  statusLabelKey: "open" | "overdue" | "closed" | "skipped";

  primaryAction: ReturningHeaderPrimaryAction;
  showCloseSheen: boolean;

  microcopyKey?: "readyToFinalize" | "actionRequired" | "closingOpensSoon";
  microcopyText?: string | null;

  showPreviewNextMonth: boolean;
};

type Args = {
  periodStatus: BudgetPeriodStatus;
  lifecycleState: HeaderLifecycleState;
  canGoNext: boolean;
  canCloseMonth: boolean;
  closeMonthButtonLabel?: string | null;
  noticeText?: string | null;
  canPreviewNextMonth?: boolean;
};

export function buildReturningHeaderViewModel({
  periodStatus,
  lifecycleState,
  canGoNext,
  canCloseMonth,
  closeMonthButtonLabel,
  noticeText,
  canPreviewNextMonth = false,
}: Args): ReturningHeaderViewModel {
  const showCloseAction =
    periodStatus === "open" && canCloseMonth && !!closeMonthButtonLabel;

  const statusTone: ReturningHeaderStatusTone =
    periodStatus === "closed"
      ? "closed"
      : periodStatus === "skipped"
        ? "skipped"
        : lifecycleState === "overdue"
          ? "overdue"
          : "open";

  const primaryAction: ReturningHeaderPrimaryAction = showCloseAction
    ? "close"
    : canGoNext
      ? "next"
      : "lockedNext";

  const microcopyKey = showCloseAction
    ? lifecycleState === "overdue"
      ? "actionRequired"
      : lifecycleState === "eligible"
        ? "readyToFinalize"
        : undefined
    : lifecycleState === "upcoming"
      ? "closingOpensSoon"
      : undefined;

  return {
    statusTone,
    statusLabelKey: statusTone,
    primaryAction,
    showCloseSheen: showCloseAction && lifecycleState === "overdue",
    microcopyKey,
    microcopyText: noticeText ?? null,
    showPreviewNextMonth: showCloseAction && canPreviewNextMonth,
  };
}
