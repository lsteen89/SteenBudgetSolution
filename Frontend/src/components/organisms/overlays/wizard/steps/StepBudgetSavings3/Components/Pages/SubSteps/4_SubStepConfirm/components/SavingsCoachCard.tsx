import React, { useMemo } from "react";
import { ShieldCheck, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";

type Props = {
    disposableAfterExpensesMonthly: number;               // income - expenses
    disposableAfterExpensesAndSavingsMonthly: number;     // income - expenses - savings
    totalSavingsMonthly: number;
    goalsCount: number;
    onPrimaryAction?: () => void;
    primaryActionLabel?: string;
};

type Status = "deficit" | "tight" | "ok";

const num = (v: number) => (Number.isFinite(v) ? v : 0);

function classify(margin: number): Status {
    if (margin < 0) return "deficit";
    if (margin < 1500) return "tight";
    return "ok";
}

export default function SavingsCoachCard({
    disposableAfterExpensesMonthly,
    disposableAfterExpensesAndSavingsMonthly,
    totalSavingsMonthly,
    goalsCount,
    onPrimaryAction,
    primaryActionLabel,
}: Props) {
    const currency = useAppCurrency();
    const locale = useAppLocale();
    const money0 = (v: number) => formatMoneyV2(num(v), currency, locale, { fractionDigits: 0 });

    const afterExpenses = num(disposableAfterExpensesMonthly);
    const afterSavings = num(disposableAfterExpensesAndSavingsMonthly);
    const status = useMemo(() => classify(afterSavings), [afterSavings]);

    const ui = useMemo(() => {
        if (status === "deficit") {
            return {
                Icon: XCircle,
                badge: "Går inte ihop (än)",
                tone: "danger" as const,
                title: "Du sparar mer än du har utrymme för",
                bullets: [
                    `Efter sparande saknas ${money0(Math.abs(afterSavings))} kr/mån.`,
                    "Justera sparande eller utgifter så budgeten går plus.",
                ],
                hint:
                    goalsCount > 0
                        ? "Rekommendation: pausa ett mål eller sänk målsparandet tillfälligt."
                        : "Rekommendation: börja med en liten sparvana och bygg upp över tid.",
            };
        }

        if (status === "tight") {
            return {
                Icon: AlertTriangle,
                badge: "Tight men möjlig",
                tone: "warn" as const,
                title: "Du har liten marginal efter sparande",
                bullets: [
                    `Kvar efter sparande: ${money0(afterSavings)} kr/mån.`,
                    "Bra disciplin — men lämna gärna luft för oväntade kostnader.",
                ],
                hint: "Rekommendation: sänk sparandet lite eller skapa buffert först.",
            };
        }

        return {
            Icon: ShieldCheck,
            badge: "Ser hållbart ut",
            tone: "ok" as const,
            title: "Sparplanen ser realistisk ut",
            bullets: [
                `Utrymme efter utgifter: ${money0(afterExpenses)} kr/mån.`,
                `Kvar efter sparande: ${money0(afterSavings)} kr/mån.`,
            ],
            hint:
                goalsCount > 0
                    ? "Rekommendation: prioritera 1 mål tydligt — annars sprids sparandet för tunt."
                    : totalSavingsMonthly > 0
                        ? "Rekommendation: lägg till ett mål så sparandet får ett jobb."
                        : "Rekommendation: börja med 200–300 kr/mån. Kontinuitet slår ambition.",
        };
    }, [status, afterExpenses, afterSavings, goalsCount, totalSavingsMonthly, money0]);

    const toneStyles =
        ui.tone === "danger"
            ? {
                icon: "text-wizard-warning",
                chip: "border-wizard-warning/25 bg-wizard-warning/10 text-wizard-warning",
                rail: "bg-wizard-warning/10 border-wizard-warning/20",
            }
            : ui.tone === "warn"
                ? {
                    icon: "text-wizard-warning",
                    chip: "border-wizard-warning/20 bg-wizard-warning/10 text-wizard-text",
                    rail: "bg-wizard-shell/45 border-wizard-stroke/20",
                }
                : {
                    icon: "text-wizard-accent",
                    chip: "border-wizard-stroke/25 bg-wizard-shell/45 text-wizard-text",
                    rail: "bg-wizard-shell/45 border-wizard-stroke/20",
                };

    return (
        <div
            className="
        rounded-3xl
        bg-wizard-shell/70 border border-wizard-stroke/25
        shadow-[0_10px_30px_rgba(2,6,23,0.10)]
        p-4 sm:p-6
        space-y-4
        overflow-hidden
      "
        >
            {/* top row */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div
                        className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-2xl",
                            "bg-wizard-surface border border-wizard-stroke/20",
                            "shadow-[0_6px_14px_rgba(2,6,23,0.06)]"
                        )}
                    >
                        <ui.Icon className={cn("h-5 w-5", toneStyles.icon)} />
                    </div>

                    <span
                        className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
                            "truncate",
                            toneStyles.chip
                        )}
                    >
                        {ui.badge}
                    </span>
                </div>

                <span className="shrink-0 text-[11px] font-semibold text-wizard-text/45">
                    Innan skulder
                </span>
            </div>

            {/* body */}
            <div className="space-y-2">
                <p className="text-base font-semibold text-wizard-text">{ui.title}</p>

                <ul className="space-y-1.5">
                    {ui.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-wizard-text/70">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-wizard-text/25" />
                            <span className="leading-snug">{b}</span>
                        </li>
                    ))}
                </ul>

                <div className={cn("rounded-2xl border px-4 py-3", toneStyles.rail)}>
                    <p className="text-xs text-wizard-text/65 leading-relaxed">{ui.hint}</p>
                </div>
            </div>

            {/* CTA */}
            {onPrimaryAction ? (
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={onPrimaryAction}
                        className="
              inline-flex items-center gap-2 rounded-2xl px-4 py-2
              bg-wizard-surface border border-wizard-stroke/20
              text-sm font-semibold text-wizard-text
              shadow-sm shadow-black/5
              transition-colors
              hover:border-wizard-stroke/35
              hover:bg-wizard-stroke/10
              focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45
            "
                    >
                        {primaryActionLabel ?? "Justera"}
                        <ArrowRight className="h-4 w-4 text-wizard-text/70" />
                    </button>
                </div>
            ) : null}
        </div>
    );
}
