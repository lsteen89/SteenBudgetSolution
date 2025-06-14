import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Home, Utensils, Car, ClipboardList, Play } from "lucide-react";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { sumArray, calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";
import ExpenditureAccordion from "@components/molecules/misc/ExpenditureAccordion";
import useMediaQuery from "@/hooks/useMediaQuery";

/* ─────────────────────────── types ─────────────────────────── */
type Slice = {
  name: string;
  value: number;
};

/* ─────────────────── constants & components ────────────────── */
const COLORS = ["#32CD32", "#CCE5FF", "#001F3F", "#98FF98", "#88a4d4"]; // Added more colors

// A simplified Doughnut chart. It can set the active accordion item on click.
const SummaryDoughnut: React.FC<{
  slices: Slice[];
  onSliceClick: (name: string) => void;
}> = ({ slices, onSliceClick }) => {
  const total = sumArray(slices.map((s) => s.value));
  if (!total) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={2}
          onClick={(_, index) => onSliceClick(slices[index].name)}
        >
          {slices.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer" />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `${v.toLocaleString("sv-SE")} kr`} />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-lg font-bold fill-white"
        >
          Dina Utgifter
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};

/* ───────────────────── main component ───────────────────── */

const SubStepConfirm: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)'); 

  const { expenditure } = useWizardDataStore((s) => s.data);
  const exp = expenditure; // shorthand

  // State to manage which accordion section is open
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Use memos for calculations remain the same
  const rentTotal = sumArray([
    exp.rent?.monthlyRent,
    exp.rent?.rentExtraFees,
    exp.rent?.monthlyFee,
    exp.rent?.brfExtraFees,
    exp.rent?.mortgagePayment,
    exp.rent?.houseotherCosts,
    exp.rent?.otherCosts,
  ]);

  const transportTotal = sumArray([
    exp.transport?.monthlyFuelCost,
    exp.transport?.monthlyInsuranceCost,
    exp.transport?.monthlyTotalCarCost,
    exp.transport?.monthlyTransitCost,
  ]);

  const foodTotal = sumArray([
    exp.food?.foodStoreExpenses,
    exp.food?.takeoutExpenses,
  ]);

  const fixedTotal = sumArray([
    exp.fixedExpenses?.insurance,
    exp.fixedExpenses?.electricity,
    exp.fixedExpenses?.internet,
    exp.fixedExpenses?.phone,
    exp.fixedExpenses?.unionFees,
    ...(exp.fixedExpenses?.customExpenses?.map(e => e?.fee) ?? []),
  ]);

  const variableTotal = sumArray([
    exp.clothing?.monthlyClothingCost,
    exp.subscriptions?.netflix,
    exp.subscriptions?.spotify,
    exp.subscriptions?.hbomax,
    exp.subscriptions?.viaplay,
    exp.subscriptions?.disneyPlus,
    ...(exp.subscriptions?.customSubscriptions?.map(s => s?.cost) ?? []),
  ]);
  const grandTotal = rentTotal + transportTotal + foodTotal + fixedTotal + variableTotal;
  const incomeTotal = calcMonthlyIncome(useWizardDataStore((s) => s.data.income));
  const remaining = incomeTotal - grandTotal;

  const allCategories = useMemo(() => {
  const createBreakdown = (items: Record<string, number | null | undefined>) =>
        Object.entries(items)
            .map(([name, value]) => ({ name, value: value ?? 0 }))
            .filter(item => item.value > 0);

    return [
      {
        name: "Boende",
        value: rentTotal,
        icon: <Home />,
        breakdown: createBreakdown({
            "Månadshyra": exp.rent?.monthlyRent,
            "Avgift till BRF": exp.rent?.monthlyFee,
            "Bolån": exp.rent?.mortgagePayment,
            "Övriga avgifter": sumArray([exp.rent?.rentExtraFees, exp.rent?.brfExtraFees, exp.rent?.houseotherCosts, exp.rent?.otherCosts]),
        }),
      },
      {
        name: "Transport",
        value: transportTotal,
        icon: <Car />,
        breakdown: createBreakdown({
            "Bränsle": exp.transport?.monthlyFuelCost,
            "Försäkring": exp.transport?.monthlyInsuranceCost,
            "Bilomkostnader": exp.transport?.monthlyTotalCarCost,
            "Kollektivtrafik": exp.transport?.monthlyTransitCost,
        }),
      },
      {
        name: "Mat",
        value: foodTotal,
        icon: <Utensils />,
        breakdown: createBreakdown({
            "Livsmedel": exp.food?.foodStoreExpenses,
            "Restaurang/Take-away": exp.food?.takeoutExpenses,
        }),
      },
      {
        name: "Fasta Utgifter", 
        value: fixedTotal,
        icon: <ClipboardList />,
        breakdown: [
            ...createBreakdown({
                "Försäkringar": exp.fixedExpenses?.insurance,
                "El": exp.fixedExpenses?.electricity,
                "Internet": exp.fixedExpenses?.internet,
                "Telefon": exp.fixedExpenses?.phone,
                "Fackavgifter": exp.fixedExpenses?.unionFees,
            }),
            ...(exp.fixedExpenses?.customExpenses?.filter((e): e is NonNullable<typeof e> => !!e).map(e => ({name: e.name ?? 'Annan fast utgift', value: e.fee ?? 0})) ?? [])
        ],
      },
      {
        name: "Rörliga Utgifter", // Renamed for clarity
        value: variableTotal,
        icon: <Play />,
        breakdown: [
            ...createBreakdown({
                "Kläder & skor": exp.clothing?.monthlyClothingCost,
                "Netflix": exp.subscriptions?.netflix,
                "Spotify": exp.subscriptions?.spotify,
                "HBO Max": exp.subscriptions?.hbomax,
                "Viaplay": exp.subscriptions?.viaplay,
                "Disney+": exp.subscriptions?.disneyPlus,
            }),
            ...(exp.subscriptions?.customSubscriptions?.filter((s): s is NonNullable<typeof s> => !!s).map(s => ({name: s.name ?? 'Annan prenumeration', value: s.cost ?? 0})) ?? [])
        ],
      },
    ].filter(cat => cat.value > 0); // Only show categories with expenses
  }, [exp, rentTotal, transportTotal, foodTotal, fixedTotal, variableTotal]);

  const doughnutSlices = allCategories.map(({ name, value }) => ({ name, value }));

  return (
    <OptionContainer>
      {/* 1. Header & Welcome */}
      <section className="space-y-6 text-white">
        <motion.h3
            className="text-xl md:text-2xl font-bold text-center text-darkLimeGreen"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            Sammanfattning
        </motion.h3>

        
        <motion.p 
            className="text-center text-white/80 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
        >
            Bra jobbat! Du har nu kartlagt dina utgifter. Här är en översikt av din budget.
            Kom ihåg att detta är en startpunkt, inte ett slutgiltigt resultat.
        </motion.p>

        {/* 2. The Overview Chart */}
        {isDesktop && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <SummaryDoughnut slices={doughnutSlices} onSliceClick={setOpenCategory} />
          </motion.div>
        )}

        {/* 3. The Interactive Accordion Breakdown */}
        <ExpenditureAccordion
            categories={allCategories}
            grandTotal={grandTotal}
            openCategory={openCategory}
            setOpenCategory={setOpenCategory}
        />

        {/* 4. The Final Summary */}
        <motion.div 
            className="text-center bg-white/5 p-4 rounded-lg text-sm text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
            Ser något inte helt rätt ut? Du kan antingen gå tillbaka och justera siffrorna nu,
            eller fortsätta och ändra dem senare. En budget är ett levande dokument som du kan
            och bör anpassa över tid!
        </motion.div>

        <div className="text-center space-y-1 pt-6 border-t border-white/20">
          <p className="text-lg font-bold">
            Inkomst: {`${incomeTotal.toLocaleString("sv-SE")} kr`}
          </p>
          <p className="text-lg font-bold">
            Utgifter: {`${grandTotal.toLocaleString("sv-SE")} kr`}
          </p>
          <p className={`text-xl font-bold ${remaining >= 0 ? "text-darkLimeGreen" : "text-red-400"}`}>
            {remaining >= 0 ? "Kvar efter utgifter: " : "Underskott: "}
            {`${Math.abs(remaining).toLocaleString("sv-SE")} kr`}
          </p>
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepConfirm;