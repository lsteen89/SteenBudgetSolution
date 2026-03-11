import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import {
  asCategoryKey,
  labelCategory,
  type CategoryKey,
} from "@/utils/i18n/budget/categories";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { tLedger } from "@/utils/i18n/budget/ledgerText";
import type { AppLocale } from "@/utils/i18n/locale";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import React, { useMemo, useState } from "react";

type Props = { preview: BudgetDashboardDto };

const LedgerRow: React.FC<{
  label: string;
  value: string | number | null | undefined;
  currency: CurrencyCode;
  locale: AppLocale;
}> = ({ label, value, currency, locale }) => {
  if (value == null) return null;
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-y-1 py-2 border-b border-slate-700/50">
      <span className="text-white/70 truncate">{label}</span>
      <span className="font-mono font-semibold text-white sm:text-right">
        {typeof value === "number"
          ? formatMoneyV2(value, currency, locale)
          : value}
      </span>
    </li>
  );
};

type GroupedRecurring = {
  key: string;
  label: string;
  items: Array<{ id: string; name: string; amountMonthly: number }>;
  total: number;
};

export default function DetailedLedger({ preview }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const currency = useAppCurrency();
  const locale = useAppLocale() as AppLocale;

  const incomeTotal = preview.income?.totalIncomeMonthly ?? 0;
  const expensesTotal = preview.expenditure?.totalExpensesMonthly ?? 0;

  const habitSavings = preview.savings?.monthlySavings ?? 0;
  const goalSavings = preview.savings?.totalGoalSavingsMonthly ?? 0;
  const totalSavings = preview.savings?.totalSavingsMonthly ?? 0;

  const debtPayments = preview.debt?.totalMonthlyPayments ?? 0;

  const finalBalance =
    preview.finalBalanceWithCarryMonthly ??
    incomeTotal - expensesTotal - totalSavings - debtPayments;

  const groupedRecurring = useMemo<GroupedRecurring[]>(() => {
    const items = preview.recurringExpenses ?? [];
    if (items.length === 0) return [];

    const map = new Map<CategoryKey, GroupedRecurring>();

    for (const r of items) {
      const key = asCategoryKey(r.categoryKey ?? r.categoryName);
      const groupLabel = labelCategory(key, locale);

      let group = map.get(key);
      if (!group) {
        group = { key, label: groupLabel, items: [], total: 0 };
        map.set(key, group);
      }

      group.items.push({
        id: r.id ?? `${key}:${r.name ?? "item"}:${group.items.length}`,
        name: labelLedgerItem(r.name ?? "Unknown", locale),
        amountMonthly: r.amountMonthly ?? 0,
      });

      group.total += r.amountMonthly ?? 0;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [preview.recurringExpenses, locale]);

  const categorySummaryRows = useMemo(() => {
    const cats = preview.expenditure?.byCategory ?? [];
    return cats.map((c, idx) => {
      const key = asCategoryKey(c.categoryKey ?? c.categoryName);
      return {
        id: `${key}:${idx}`,
        label: labelCategory(key, locale),
        value: -(c.totalMonthlyAmount ?? 0),
      };
    });
  }, [preview.expenditure?.byCategory, locale]);

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => setIsOpen((x) => !x)}
        aria-expanded={isOpen}
        className="w-full inline-flex items-center justify-between gap-2 rounded-full border border-darkLimeGreen/70 bg-slate-900/70 px-4 py-2 text-sm sm:text-base font-semibold text-darkLimeGreen shadow-sm hover:bg-slate-900 hover:border-lime-300 hover:text-white transition-colors"
      >
        <span>
          {isOpen ? tLedger("hide", locale) : tLedger("show", locale)}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-left mt-6 overflow-hidden"
          >
            <Accordion type="multiple" className="space-y-4">
              {/* INCOME */}
              <AccordionItem
                value="income"
                className="bg-slate-800/50 rounded-xl border-none"
              >
                <AccordionTrigger className="px-6 font-bold text-white">
                  {tLedger("income", locale)}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <ul>
                    <LedgerRow
                      label={tLedger("netSalary", locale)}
                      value={preview.income?.netSalaryMonthly ?? 0}
                      currency={currency}
                      locale={locale}
                    />

                    {(preview.income?.householdMembers?.length ?? 0) > 0 && (
                      <>
                        <LedgerRow
                          label={tLedger("householdTotal", locale)}
                          value={preview.income?.householdMembersMonthly ?? 0}
                          currency={currency}
                          locale={locale}
                        />
                        {preview.income!.householdMembers.map((m, idx) => (
                          <LedgerRow
                            key={m.id ?? `${m.name ?? "member"}:${idx}`}
                            label={`• ${m.name ?? tLedger("householdMemberFallback", locale)}`}
                            value={m.amountMonthly ?? 0}
                            currency={currency}
                            locale={locale}
                          />
                        ))}
                      </>
                    )}

                    {(preview.income?.sideHustles?.length ?? 0) > 0 && (
                      <>
                        <LedgerRow
                          label={tLedger("sideIncomeTotal", locale)}
                          value={preview.income?.sideHustleMonthly ?? 0}
                          currency={currency}
                          locale={locale}
                        />
                        {preview.income!.sideHustles.map((h, idx) => (
                          <LedgerRow
                            key={h.id ?? `${h.name ?? "side"}:${idx}`}
                            label={`• ${h.name ?? tLedger("sideIncomeFallback", locale)}`}
                            value={h.amountMonthly ?? 0}
                            currency={currency}
                            locale={locale}
                          />
                        ))}
                      </>
                    )}

                    <LedgerRow
                      label={tLedger("totalIncomePerMonth", locale)}
                      value={incomeTotal}
                      currency={currency}
                      locale={locale}
                    />
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* EXPENSES */}
              <AccordionItem
                value="expenditure"
                className="bg-slate-800/50 rounded-xl border-none"
              >
                <AccordionTrigger className="px-6 font-bold text-white">
                  {tLedger("expenses", locale)}
                </AccordionTrigger>

                <AccordionContent className="px-6 pb-4 space-y-4">
                  <ul>
                    {categorySummaryRows.map((r) => (
                      <LedgerRow
                        key={r.id}
                        label={r.label}
                        value={r.value}
                        currency={currency}
                        locale={locale}
                      />
                    ))}
                    <LedgerRow
                      label={tLedger("totalExpensesPerMonth", locale)}
                      value={-expensesTotal}
                      currency={currency}
                      locale={locale}
                    />
                  </ul>

                  {groupedRecurring.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {groupedRecurring.map((g) => (
                        <div key={g.key}>
                          <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                            {g.label}
                          </p>
                          <ul>
                            <LedgerRow
                              label={tLedger("total", locale)}
                              value={-g.total}
                              currency={currency}
                              locale={locale}
                            />
                            {g.items.map((x) => (
                              <LedgerRow
                                key={x.id}
                                label={`• ${x.name}`}
                                value={-(x.amountMonthly ?? 0)}
                                currency={currency}
                                locale={locale}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* SAVINGS */}
              <AccordionItem
                value="savings"
                className="bg-slate-800/50 rounded-xl border-none"
              >
                <AccordionTrigger className="px-6 font-bold text-white">
                  {tLedger("savings", locale)}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <ul>
                    <LedgerRow
                      label={tLedger("savingsHabit", locale)}
                      value={habitSavings}
                      currency={currency}
                      locale={locale}
                    />
                    <LedgerRow
                      label={tLedger("savingsGoals", locale)}
                      value={goalSavings}
                      currency={currency}
                      locale={locale}
                    />
                    <LedgerRow
                      label={tLedger("totalSavingsPerMonth", locale)}
                      value={totalSavings}
                      currency={currency}
                      locale={locale}
                    />

                    {(preview.savings?.goals?.length ?? 0) > 0 && (
                      <>
                        <li className="py-2" />
                        {preview.savings!.goals.map((g, idx) => (
                          <LedgerRow
                            key={g.id ?? `${g.name ?? "goal"}:${idx}`}
                            label={`• ${g.name ?? tLedger("savingsGoalFallback", locale)}`}
                            value={g.monthlyContribution ?? 0}
                            currency={currency}
                            locale={locale}
                          />
                        ))}
                      </>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* DEBTS */}
              <AccordionItem
                value="debts"
                className="bg-slate-800/50 rounded-xl border-none"
              >
                <AccordionTrigger className="px-6 font-bold text-white">
                  {tLedger("debts", locale)}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <ul>
                    <LedgerRow
                      label={tLedger("debtPaymentsPerMonth", locale)}
                      value={debtPayments}
                      currency={currency}
                      locale={locale}
                    />
                    <LedgerRow
                      label={tLedger("totalDebtBalance", locale)}
                      value={preview.debt?.totalDebtBalance ?? 0}
                      currency={currency}
                      locale={locale}
                    />

                    {(preview.debt?.debts?.length ?? 0) > 0 && (
                      <>
                        <li className="py-2" />
                        {preview.debt!.debts.map((d, idx) => (
                          <LedgerRow
                            key={d.id ?? `${d.name ?? "debt"}:${idx}`}
                            label={`• ${d.name ?? tLedger("debtFallback", locale)}`}
                            value={`${formatMoneyV2(d.balance ?? 0, currency, locale)} @ ${(d.apr ?? 0).toFixed(1)}% (${formatMoneyV2(d.monthlyPayment ?? 0, currency, locale)}/mo)`}
                            currency={currency}
                            locale={locale}
                          />
                        ))}
                      </>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* RESULT */}
              <AccordionItem
                value="result"
                className="bg-slate-800/50 rounded-xl border-none"
              >
                <AccordionTrigger className="px-6 font-bold text-white">
                  {tLedger("result", locale)}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <ul>
                    <LedgerRow
                      label={tLedger("monthlyResult", locale)}
                      value={finalBalance}
                      currency={currency}
                      locale={locale}
                    />
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
