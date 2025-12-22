import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import formatCurrency from "@/utils/money/currencyFormatter";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { sumArray, toMonthly, type Freq } from "@/utils/wizard/wizardHelpers";
import { useBudgetSummary } from "@/hooks/budget/useBudgetSummary";

const LedgerRow: React.FC<{ label: string; value: string | number | null }> = ({ label, value }) =>
    value == null
        ? null
        : (
            <li className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-y-1 py-2 border-b border-slate-700/50">
                <span className="text-white/70 truncate">{label}</span>
                <span className="font-mono font-semibold text-white sm:text-right">
                    {typeof value === "number" ? formatCurrency(value) : value}
                </span>
            </li>
        );



const DetailedLedger: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { income, expenditure, savings, debts } = useWizardDataStore((s) => s.data);
    const {
        categoryRows,
        totalIncome,
        totalSavings,
        habitSavings,
        goalSavings,
        debtSummary,
        totalDebtPayments,
        finalBalance,
    } = useBudgetSummary();

    const incomeRows = useMemo(() => {
        const sideHustles = income.sideHustles ?? [];
        const members = income.householdMembers ?? [];

        const memberRows = members.map((m, index) => ({
            key: m.id ?? m.name ?? `member-${index}`,
            label: m.name ?? "Hushållsmedlem",
            value: toMonthly(
                m?.income ?? m?.yearlyIncome,
                (m?.frequency as Freq) ?? (m?.yearlyIncome ? "yearly" : "monthly"),
            ),
        }));

        const sideHustleRows = sideHustles.map((h, index) => ({
            key: h.id ?? h.name ?? `side-${index}`,
            label: h.name ?? "Sidoinkomst",
            value: toMonthly(
                h?.income ?? h?.yearlyIncome,
                (h?.frequency as Freq) ?? (h?.yearlyIncome ? "yearly" : "monthly"),
            ),
        }));

        const otherIncomeValue = toMonthly(
            income.otherIncome,
            (income.otherIncomeFrequency as Freq) ?? "monthly",
        );

        return { memberRows, sideHustleRows, otherIncomeValue };
    }, [income]);

    const totalSideIncome = sumArray(incomeRows.sideHustleRows.map(r => r.value));
    const totalMembersIncome = sumArray(incomeRows.memberRows.map(r => r.value));
    const otherIncome = incomeRows.otherIncomeValue;

    return (
        <div className="text-center">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className="w-full inline-flex items-center justify-between gap-2 rounded-full border border-darkLimeGreen/70 bg-slate-900/70 px-4 py-2 text-sm sm:text-base font-semibold text-darkLimeGreen shadow-sm hover:bg-slate-900 hover:border-lime-300 hover:text-white transition-colors"
            >
                <span>
                    {isOpen ? 'Dölj detaljerad summering' : 'Visa fullständig detaljsummering'}
                </span>
                <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-left mt-6 overflow-hidden"
                    >
                        <Accordion type="multiple" className="space-y-4">
                            {/* INKOMSTER */}

                            <AccordionItem value="income" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">
                                    Inkomster
                                </AccordionTrigger>

                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        <LedgerRow label="Nettolön" value={income.netSalary ?? null} />

                                        {incomeRows.memberRows.length > 0 && (
                                            <>
                                                <LedgerRow label="Hushållsinkomster totalt" value={totalMembersIncome} />
                                                {incomeRows.memberRows.map(r => (
                                                    <LedgerRow key={r.key} label={`• ${r.label}`} value={r.value} />
                                                ))}
                                            </>
                                        )}

                                        {incomeRows.sideHustleRows.length > 0 && (
                                            <>
                                                <LedgerRow label="Sidoinkomster totalt" value={totalSideIncome} />
                                                {incomeRows.sideHustleRows.map(r => (
                                                    <LedgerRow key={r.key} label={`• ${r.label}`} value={r.value} />
                                                ))}
                                            </>
                                        )}

                                        {otherIncome > 0 && (
                                            <LedgerRow label="Övriga inkomster" value={otherIncome} />
                                        )}

                                        {/* SINGLE SOURCE OF TRUTH */}
                                        <LedgerRow label="Total inkomst / månad" value={totalIncome} />
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            {/* UTGIFTER */}
                            <AccordionItem value="expenditure" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">
                                    Utgifter
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4 space-y-4">
                                    {/* 1) Snabb summering per kategori */}
                                    {categoryRows.map(item => (
                                        <LedgerRow key={item.label} label={item.label} value={item.value} />
                                    ))}

                                    {/* 2) Detaljer per kategori */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {/* Boende */}
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                                                Boende
                                            </p>
                                            <ul>
                                                <LedgerRow label="Hyra" value={expenditure.rent?.monthlyRent ?? null} />
                                                <LedgerRow label="Hyra – extra avgifter" value={expenditure.rent?.rentExtraFees ?? null} />
                                                <LedgerRow label="BRF månadsavgift" value={expenditure.rent?.monthlyFee ?? null} />
                                                <LedgerRow label="BRF extra avgifter" value={expenditure.rent?.brfExtraFees ?? null} />
                                                <LedgerRow label="Bolånebetalning" value={expenditure.rent?.mortgagePayment ?? null} />
                                                <LedgerRow label="Hus – övriga kostnader" value={expenditure.rent?.houseotherCosts ?? null} />
                                                <LedgerRow label="Övriga boendekostnader" value={expenditure.rent?.otherCosts ?? null} />
                                            </ul>
                                        </div>

                                        {/* Transport */}
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                                                Transport
                                            </p>
                                            <ul>
                                                <LedgerRow label="Bränsle" value={expenditure.transport?.monthlyFuelCost ?? null} />
                                                <LedgerRow label="Försäkring" value={expenditure.transport?.monthlyInsuranceCost ?? null} />
                                                <LedgerRow label="Övriga bilkostnader" value={expenditure.transport?.monthlyTotalCarCost ?? null} />
                                                <LedgerRow label="Kollektivtrafik" value={expenditure.transport?.monthlyTransitCost ?? null} />
                                            </ul>
                                        </div>

                                        {/* Mat */}
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                                                Mat
                                            </p>
                                            <ul>
                                                <LedgerRow label="Matbutik" value={expenditure.food?.foodStoreExpenses ?? null} />
                                                <LedgerRow label="Uteätande / hämtmat" value={expenditure.food?.takeoutExpenses ?? null} />
                                            </ul>
                                        </div>

                                        {/* Fasta utgifter */}
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                                                Fasta utgifter
                                            </p>
                                            <ul>
                                                <LedgerRow label="El" value={expenditure.fixedExpenses?.electricity ?? null} />
                                                <LedgerRow label="Försäkring" value={expenditure.fixedExpenses?.insurance ?? null} />
                                                <LedgerRow label="Internet" value={expenditure.fixedExpenses?.internet ?? null} />
                                                <LedgerRow label="Telefon" value={expenditure.fixedExpenses?.phone ?? null} />
                                                <LedgerRow label="Fackavgift" value={expenditure.fixedExpenses?.unionFees ?? null} />
                                                {expenditure.fixedExpenses?.customExpenses?.map((e, index) => {
                                                    if (!e) return null;
                                                    return (
                                                        <LedgerRow
                                                            key={e.id ?? e.name ?? `fixed-${index}`}
                                                            label={e.name ?? "Annan fast utgift"}
                                                            value={e.cost ?? null}
                                                        />
                                                    );
                                                })}
                                            </ul>
                                        </div>

                                        {/* Prenumerationer */}
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                                                Prenumerationer
                                            </p>
                                            <ul>
                                                <LedgerRow label="Netflix" value={expenditure.subscriptions?.netflix ?? null} />
                                                <LedgerRow label="Spotify" value={expenditure.subscriptions?.spotify ?? null} />
                                                <LedgerRow label="HBO Max" value={expenditure.subscriptions?.hbomax ?? null} />
                                                <LedgerRow label="Viaplay" value={expenditure.subscriptions?.viaplay ?? null} />
                                                <LedgerRow label="Disney+" value={expenditure.subscriptions?.disneyPlus ?? null} />
                                                {expenditure.subscriptions?.customSubscriptions?.map((s, index) => {
                                                    if (!s) return null;
                                                    return (
                                                        <LedgerRow
                                                            key={s.id ?? s.name ?? `sub-${index}`}
                                                            label={s.name ?? "Annan prenumeration"}
                                                            value={s.cost ?? null}
                                                        />
                                                    );
                                                })}
                                            </ul>
                                        </div>

                                        {/* Rörliga utgifter / Kläder */}
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">
                                                Rörliga utgifter
                                            </p>
                                            <ul>
                                                <LedgerRow label="Kläder" value={expenditure.clothing?.monthlyClothingCost ?? null} />
                                            </ul>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* SPARANDE */}
                            <AccordionItem value="savings" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">Sparande</AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        <LedgerRow label="Månadssparande (vana)" value={habitSavings} />
                                        <LedgerRow label="Månadssparande (mål)" value={goalSavings} />
                                        <LedgerRow label="Totalt sparande / månad" value={totalSavings} />
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            {/* SKULDER */}
                            <AccordionItem value="debts" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">Skulder</AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        <LedgerRow label="Skuldbetalningar / månad" value={totalDebtPayments} />
                                        {debts.debts?.map((debt, index) => (
                                            <LedgerRow
                                                key={debt.id ?? debt.name ?? `debt-${index}`}
                                                label={debt.name ?? "Namnlös skuld"}
                                                value={`${formatCurrency(debt.balance ?? 0)} @ ${(debt.apr ?? 0).toFixed(1)}%`}
                                            />
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DetailedLedger;
