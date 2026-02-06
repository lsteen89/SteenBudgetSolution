import React from "react";

export default function DebtAnchorsCard({
    highestApr,
    smallestBalance,
    money0,
}: {
    highestApr?: { name: string; apr: number };
    smallestBalance?: { name: string; balance: number };
    money0: (v: number) => string;
}) {
    return (
        <div className="border-white/15 bg-white/[0.06] rounded-2xl p-4 sm:p-6">
            <p className="text-white/90 font-semibold">Två tydliga startpunkter</p>
            <p className="text-sm text-white/70 mt-1">
                Vi visar dem för att göra valet nedan enkelt.
            </p>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs text-white/60">Högst ränta</p>
                    <p className="text-sm text-white/90 font-semibold truncate">{highestApr?.name ?? "—"}</p>
                    <p className="text-xs text-white/60 mt-1">{highestApr ? `${highestApr.apr.toFixed(1)}%` : "—"}</p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs text-white/60">Minsta skuld</p>
                    <p className="text-sm text-white/90 font-semibold truncate">{smallestBalance?.name ?? "—"}</p>
                    <p className="text-xs text-white/60 mt-1">{smallestBalance ? money0(smallestBalance.balance) : "—"}</p>
                </div>
            </div>
        </div>
    );
}
