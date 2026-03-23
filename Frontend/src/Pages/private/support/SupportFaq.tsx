import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { cn } from "@/lib/utils";
import type { SupportKey, SupportT } from "./support.types";

type SupportFaqProps = {
  t: SupportT;
};

type FaqItem = {
  q: SupportKey;
  a: SupportKey;
};

export function SupportFaq({ t }: SupportFaqProps) {
  const items: FaqItem[] = [
    { q: "qTotals", a: "aTotals" },
    { q: "qMonth", a: "aMonth" },
    { q: "qSharing", a: "aSharing" },
    { q: "qAvailable", a: "aAvailable" },
    { q: "qHousehold", a: "aHousehold" },
    { q: "qReply", a: "aReply" },
  ];

  return (
    <SurfaceCard className="p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-eb-text">
          {t("faqTitle")}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-eb-text/65">
          {t("faqLead")}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className={cn(
              "group rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.22)] px-4 py-4",
              "open:bg-[rgb(var(--eb-shell)/0.35)]",
            )}
          >
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center justify-between gap-4",
                "text-sm font-semibold text-eb-text",
                "focus:outline-none",
              )}
            >
              <span>{t(item.q)}</span>
              <span className="shrink-0 text-eb-text/45 transition group-open:rotate-45">
                +
              </span>
            </summary>

            <div className="pt-3 pr-6">
              <p className="text-sm leading-6 text-eb-text/65">{t(item.a)}</p>
            </div>
          </details>
        ))}
      </div>
    </SurfaceCard>
  );
}
