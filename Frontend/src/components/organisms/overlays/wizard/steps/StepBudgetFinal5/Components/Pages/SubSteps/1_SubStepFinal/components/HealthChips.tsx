function HealthChips({ chips }: { chips: Array<{ label: string; tone: "neutral" | "good" | "warn" }> }) {
    const toneCls = (t: string) =>
        t === "good"
            ? "bg-wizard-accent/10 border-wizard-accent/20 text-wizard-accent"
            : t === "warn"
                ? "bg-yellow-600/10 border-wizard-stroke text-yellow-600"
                : "bg-white/5 border-white/10 text-wizard-text/70";

    return (
        <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
                <span key={c.label} className={`inline-flex items-center rounded-full px-3 py-1 text-xs border ${toneCls(c.tone)}`}>
                    {c.label}
                </span>
            ))}
        </div>
    );
}
export default HealthChips;