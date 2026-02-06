function VerdictChip({ kind, title }: { kind: "good" | "tight" | "bad"; title: string }) {
    const cls =
        kind === "good"
            ? "bg-wizard-accent/10 border-wizard-accent/20 text-wizard-accent"
            : kind === "tight"
                ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-600"
                : "bg-rose-400/10 border-rose-400/20 text-wizard-warning";

    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs border ${cls}`}>
            {title}
        </span>
    );
}
export default VerdictChip;