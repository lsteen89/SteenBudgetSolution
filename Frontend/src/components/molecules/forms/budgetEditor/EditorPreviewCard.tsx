import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type EditorPreviewCardProps = {
  label: string;
  title: string;
  subtitle: string;
  amount: string;
  status: string;
  muted?: boolean;
  children?: ReactNode;
};

export default function EditorPreviewCard({
  label,
  title,
  subtitle,
  amount,
  status,
  muted = false,
  children,
}: EditorPreviewCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        "shadow-[0_10px_24px_rgba(21,39,81,0.05)]",
        muted
          ? "border-amber-200/80 bg-amber-50/72"
          : "border-eb-stroke/35 bg-[rgb(var(--eb-shell)/0.34)]",
      )}
      data-testid="editor-preview-card"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-eb-text/48">
        {label}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-eb-text">
            {title}
          </div>
          <div className="mt-1 text-xs font-medium text-eb-text/58">
            {subtitle}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-black tabular-nums text-eb-text">
            {amount}
          </div>
          <div className="mt-1 text-xs font-semibold text-eb-text/52">
            {status}
          </div>
        </div>
      </div>

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
