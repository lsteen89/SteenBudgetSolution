import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { expenseRowActionsMenuDict } from "@/utils/i18n/pages/private/expenses/ExpenseRowActionsMenu.i18n";
import { tDict } from "@/utils/i18n/translate";
import { MoreVertical } from "lucide-react";

type ExpenseRowActionsMenuProps = {
  readOnly?: boolean;
  isActive: boolean;
  onEdit: () => void;
  onPauseToggle: () => void;
  onDelete: () => void;
};

export default function ExpenseRowActionsMenu({
  readOnly = false,
  isActive,
  onEdit,
  onPauseToggle,
  onDelete,
}: ExpenseRowActionsMenuProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof expenseRowActionsMenuDict.sv>(key: K) =>
    tDict(key, locale, expenseRowActionsMenuDict);

  if (readOnly) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          disabled
          aria-label={t("disabledAriaLabel")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.65)] text-eb-text/40"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("openAriaLabel")}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl",
            "border border-eb-stroke/30 bg-eb-surface",
            "text-eb-text/80 shadow-[0_4px_12px_rgba(21,39,81,0.08)] transition",
            "hover:bg-[rgb(var(--eb-shell)/0.55)] hover:text-eb-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--eb-accent)/0.20)]",
          )}
        >
          <MoreVertical className="h-4.5 w-4.5" strokeWidth={2.4} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className={cn(
          "z-50 min-w-[190px] rounded-2xl border border-eb-stroke/25 bg-eb-surface p-1.5",
          "shadow-[0_18px_40px_rgba(21,39,81,0.16)]",
        )}
      >
        <DropdownMenuItem
          onClick={onEdit}
          className={cn(
            "cursor-pointer rounded-xl px-3 py-2.5 text-sm text-eb-text outline-none",
            "focus:bg-[rgb(var(--eb-shell)/0.30)] data-[highlighted]:bg-[rgb(var(--eb-shell)/0.30)]",
          )}
        >
          {t("edit")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onPauseToggle}
          className={cn(
            "cursor-pointer rounded-xl px-3 py-2.5 text-sm text-eb-text outline-none",
            "focus:bg-[rgb(var(--eb-shell)/0.30)] data-[highlighted]:bg-[rgb(var(--eb-shell)/0.30)]",
          )}
        >
          {isActive ? t("pause") : t("resume")}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-eb-stroke/20" />

        <DropdownMenuItem
          onClick={onDelete}
          className={cn(
            "cursor-pointer rounded-xl px-3 py-2.5 text-sm text-eb-danger outline-none",
            "focus:bg-[rgb(var(--eb-danger)/0.08)] data-[highlighted]:bg-[rgb(var(--eb-danger)/0.08)]",
          )}
        >
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
