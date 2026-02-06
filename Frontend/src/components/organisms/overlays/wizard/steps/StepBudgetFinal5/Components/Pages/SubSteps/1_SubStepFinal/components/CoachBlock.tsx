type CoachKey = "expenditure" | "savings" | "debts";

type Coach =
    | { kind: "none" }
    | { kind: "suggest"; title: string; detail: string }
    | { kind: "fix"; title: string; detail: string; actionKey: CoachKey };

function CoachBlock({ coach, onOpen }: { coach: Coach; onOpen: (key: CoachKey) => void }) {
    if (coach.kind === "none") return null;

    const isFix = coach.kind === "fix";

    return (
        <div className={`rounded-2xl p-4 sm:p-6 border ${isFix ? "border-rose-500/20 bg-rose-500/10" : "border-white/15 bg-white/[0.06]"}`}>
            <p className="text-white/90 font-semibold">{coach.title}</p>
            <p className="text-sm text-white/70 mt-1">{coach.detail}</p>

            {coach.kind === "fix" && (
                <div className="mt-3">
                    <button type="button" onClick={() => onOpen(coach.actionKey)} className="text-sm font-semibold text-white/85 hover:text-white underline underline-offset-4">
                        Justera nu
                    </button>
                </div>
            )}
        </div>
    );
}
export default CoachBlock;