type EditorPeriodBadgeProps = {
  label: string;
  value: string;
};

export default function EditorPeriodBadge({
  label,
  value,
}: EditorPeriodBadgeProps) {
  return (
    <div
      className="inline-flex min-w-[148px] flex-col rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 py-2 text-left"
      data-testid="editor-period-badge"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-eb-text/45">
        {label}
      </span>
      <span className="text-base font-bold text-eb-text">{value}</span>
    </div>
  );
}
