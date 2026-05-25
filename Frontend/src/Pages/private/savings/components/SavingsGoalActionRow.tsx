import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

type SavingsGoalActionRowProps = {
  row: BudgetMonthSavingsGoalEditorRowDto;
  readOnly: boolean;
  baselineSupported: boolean;
  onDeposit: () => void;
  onMonthly: () => void;
  onTargetDate: () => void;
  onRename: () => void;
  onChangeTarget: () => void;
  onArchive: () => void;
  onRemove: () => void;
};

const KEBAB_OPEN_EVENT = "savings-goal-kebab-open";

export default function SavingsGoalActionRow({
  row,
  readOnly,
  baselineSupported,
  onDeposit,
  onMonthly,
  onTargetDate,
  onRename,
  onChangeTarget,
  onArchive,
  onRemove,
}: SavingsGoalActionRowProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuId = `savings-goal-actions-${row.id}`;
  const soon = t("comingSoon");
  const actionsDisabled = readOnly || row.isDeleted || row.status !== "active";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    const handleOtherOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== row.id) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener(KEBAB_OPEN_EVENT, handleOtherOpen);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(KEBAB_OPEN_EVENT, handleOtherOpen);
    };
  }, [open, row.id]);

  const toggleMenu = () => {
    if (actionsDisabled) return;
    const next = !open;
    setOpen(next);
    if (next) {
      window.dispatchEvent(
        new CustomEvent(KEBAB_OPEN_EVENT, { detail: { id: row.id } }),
      );
    }
  };

  const choose = (handler: () => void, disabled = false) => {
    if (disabled || actionsDisabled) return;
    setOpen(false);
    handler();
  };

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1.5"
      data-testid="savings-goal-action-row"
      data-baseline-supported={baselineSupported ? "true" : "false"}
    >
      <ActionChip
        label={t("actionDeposit")}
        title={soon}
        primary
        disabled
        onClick={onDeposit}
        icon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
      />
      <ActionChip
        label={t("actionMonthly")}
        disabled={actionsDisabled}
        onClick={onMonthly}
      />
      <ActionChip
        label={t("actionTargetDate")}
        disabled={actionsDisabled}
        onClick={onTargetDate}
      />

      <div ref={wrapRef} className="relative">
        <button
          type="button"
          aria-label={t("actionMore")}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-disabled={actionsDisabled ? "true" : undefined}
          title={actionsDisabled ? t("rowActionsDisabled") : t("actionMore")}
          onClick={toggleMenu}
          className={chipClassName({ disabled: actionsDisabled, kebab: true })}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            data-testid="savings-goal-kebab-menu"
            className={cn(
              "absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl",
              "border border-eb-stroke/35 bg-eb-surface shadow-[0_18px_42px_rgba(15,23,42,0.16)]",
            )}
          >
            <MenuItem
              label={t("actionRename")}
              title={soon}
              disabled
              onClick={() => choose(onRename, true)}
            />
            <MenuItem
              label={t("actionChangeTarget")}
              title={soon}
              disabled
              onClick={() => choose(onChangeTarget, true)}
            />
            <div className="my-1 h-px bg-eb-stroke/35" role="separator" />
            <MenuItem
              label={t("actionArchive")}
              onClick={() => choose(onArchive)}
            />
            <MenuItem
              label={t("actionRemove")}
              danger
              onClick={() => choose(onRemove)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionChip({
  label,
  title,
  disabled,
  primary = false,
  icon,
  onClick,
}: {
  label: string;
  title?: string;
  disabled?: boolean;
  primary?: boolean;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled ? "true" : undefined}
      title={disabled ? title : undefined}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      className={chipClassName({ disabled, primary })}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MenuItem({
  label,
  title,
  disabled,
  danger = false,
  onClick,
}: {
  label: string;
  title?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled ? "true" : undefined}
      title={disabled ? title : undefined}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      className={cn(
        "flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-semibold transition",
        disabled
          ? "cursor-not-allowed text-eb-text/35 opacity-50"
          : "text-eb-text/72 hover:bg-[rgb(var(--eb-shell)/0.36)]",
        danger &&
          !disabled &&
          "text-[rgb(var(--eb-danger))] hover:bg-[rgb(var(--eb-danger)/0.06)]",
      )}
    >
      {label}
    </button>
  );
}

function chipClassName({
  disabled,
  primary,
  kebab,
}: {
  disabled?: boolean;
  primary?: boolean;
  kebab?: boolean;
}) {
  return cn(
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3",
    "text-[12px] font-extrabold leading-none transition",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25",
    kebab ? "w-8 px-0" : null,
    primary
      ? "border-[rgb(var(--eb-accent)/0.42)] bg-[rgb(var(--eb-accent))] text-white shadow-[0_8px_16px_rgba(21,39,81,0.10)]"
      : "border-eb-stroke/55 bg-eb-surface text-eb-text/72 hover:bg-white",
    disabled
      ? "cursor-not-allowed opacity-50 hover:bg-eb-surface"
      : "cursor-pointer",
  );
}
