import { Slider } from "@/components/ui/slider";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { TrendingUp } from "lucide-react";
import React, { useMemo, useState } from "react";

type Props = {
  maxMonthly?: number;
  defaultMonthly?: number;
};

function futureValueMonthlyPmt(
  pmt: number,
  annualRatePct: number,
  years: number,
) {
  const r = annualRatePct / 100 / 12;
  const n = Math.max(0, Math.round(years * 12));
  if (n === 0) return 0;
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

export default function WhatIfSavingsCard({
  maxMonthly = 50_000,
  defaultMonthly = 1000,
}: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();
  const money0 = (v: number) =>
    formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 });

  const [monthly, setMonthly] = useState<number>(defaultMonthly);
  const [years, setYears] = useState<number>(10);
  const [rate, setRate] = useState<number>(4);

  const clampedMonthly = Math.max(0, Math.min(monthly, maxMonthly));

  const result = useMemo(() => {
    const fv = futureValueMonthlyPmt(clampedMonthly, rate, years);
    const contributed = clampedMonthly * Math.round(years * 12);
    return { fv, contributed };
  }, [clampedMonthly, rate, years]);

  const deposit = clampedMonthly * years * 12;
  const future = result.fv;
  const gain = Math.max(0, future - deposit);

  return (
    <div
      className="
        rounded-3xl
        bg-wizard-shell/70 border border-wizard-stroke/25
        shadow-[0_10px_30px_rgba(2,6,23,0.10)]
        p-4 sm:p-6
        space-y-5
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="
            grid h-10 w-10 shrink-0 place-items-center rounded-2xl
            bg-wizard-surface border border-wizard-stroke/20
            shadow-[0_6px_14px_rgba(2,6,23,0.06)]
          "
        >
          <TrendingUp className="h-5 w-5 text-wizard-accent" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-wizard-text">
            Vad händer om du sparar lite extra?
          </p>

          <p className="mt-1 text-xs text-wizard-text/60 leading-relaxed">
            Justera belopp, tid och avkastning och se ett scenario direkt.
          </p>

          {/* Summary pill */}
          <div className="mt-3 inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-wizard-surface border border-wizard-stroke/20 px-3 py-1.5 shadow-sm shadow-black/5">
              <span className="text-xs font-semibold text-wizard-text/60">
                +{" "}
              </span>
              <span className="money font-extrabold text-wizard-accent tabular-nums">
                {money0(clampedMonthly)}
              </span>
              <span className="text-xs font-semibold text-wizard-text/60">
                {" "}
                /mån
              </span>
            </span>

            <span className="rounded-full bg-wizard-surface border border-wizard-stroke/20 px-3 py-1.5 shadow-sm shadow-black/5">
              <span className="text-xs font-semibold text-wizard-text/60">
                i{" "}
              </span>
              <span className="font-extrabold text-wizard-text tabular-nums">
                {years}
              </span>
              <span className="text-xs font-semibold text-wizard-text/60">
                {" "}
                år
              </span>
            </span>

            <span className="rounded-full bg-wizard-surface border border-wizard-stroke/20 px-3 py-1.5 shadow-sm shadow-black/5">
              <span className="text-xs font-semibold text-wizard-text/60">
                med{" "}
              </span>
              <span className="font-extrabold text-wizard-text tabular-nums">
                {rate}%
              </span>
              <span className="text-xs font-semibold text-wizard-text/60">
                {" "}
                avkastning
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ControlCard
          title="Per månad"
          value={
            <span className="text-darkLimeGreen tabular-nums">
              {money0(clampedMonthly)}
            </span>
          }
        >
          <Slider
            value={[clampedMonthly]}
            min={0}
            max={maxMonthly}
            step={100}
            onValueChange={([v]) => setMonthly(v ?? 0)}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-wizard-text/45">
            <span>0</span>
            <span>{money0(maxMonthly)}</span>
          </div>
        </ControlCard>

        <ControlCard
          title="År"
          value={<span className="tabular-nums">{years}</span>}
        >
          <Slider
            value={[years]}
            min={1}
            max={30}
            step={1}
            onValueChange={([v]) => setYears(v ?? 1)}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-wizard-text/45">
            <span>1</span>
            <span>30</span>
          </div>
        </ControlCard>

        <ControlCard
          title="Förväntad avkastning"
          value={<span className="tabular-nums">{rate}%</span>}
        >
          <Slider
            value={[rate]}
            min={0}
            max={10}
            step={0.5}
            onValueChange={([v]) => setRate(v ?? 0)}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-wizard-text/45">
            <span>0%</span>
            <span>10%</span>
          </div>
        </ControlCard>
      </div>

      {/* Result */}
      <div
        className="
          rounded-3xl
          bg-wizard-surface border border-wizard-stroke/20
          shadow-[0_10px_28px_rgba(0,0,0,0.08)]
          p-4 sm:p-5
        "
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
          Scenario
        </p>

        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-wizard-text/70 leading-snug">
              Du sätter in{" "}
              <span className="font-semibold text-wizard-text tabular-nums">
                {money0(deposit)}
              </span>{" "}
              och får{" "}
              <span className="font-extrabold text-wizard-accent tabular-nums">
                +{money0(gain)}
              </span>{" "}
              i avkastning.
            </p>

            <p className="mt-2 text-xs text-wizard-text/55">
              Totalt värde efter <span className="font-semibold">{years}</span>{" "}
              år
            </p>
          </div>

          <div
            className="
              shrink-0 inline-flex items-baseline gap-2
              rounded-full bg-wizard-shell/40
              border border-wizard-stroke/20
              px-3 py-1.5
            "
          >
            <span className=" text-lg sm:text-xl font-extrabold text-wizard-text tabular-nums">
              {money0(result.fv)}
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl bg-wizard-shell/40 border border-wizard-stroke/15 px-4 py-3">
        <p className="text-xs text-wizard-text/60 leading-relaxed">
          Antagande: månadssparande i slutet av varje månad. Avkastning är ett
          scenario, inte en garanti.
          <span className="text-wizard-text/35"> • </span>
          Du kan alltid justera ditt sparande senare.
        </p>
      </div>
    </div>
  );
}

function ControlCard({
  title,
  value,
  children,
}: {
  title: string;
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-3xl
        bg-wizard-surface border border-wizard-stroke/20
        shadow-[0_10px_28px_rgba(0,0,0,0.08)]
        p-4
      "
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
          {title}
        </p>
        <p className="text-sm font-extrabold text-wizard-text">{value}</p>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}
