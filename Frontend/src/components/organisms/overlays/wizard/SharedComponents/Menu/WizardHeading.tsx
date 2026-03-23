import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import React from "react";

interface WizardHeadingProps {
  step: number;
  type: "wizard" | "expenditure";
}

type Dict = {
  wizard: Record<number, string>;
  expenditure: Record<number, string>;
  fallback: string;
};

const headings: Record<"sv" | "en" | "et", Dict> = {
  sv: {
    fallback: "Setup Wizard",
    wizard: {
      0: "",
      1: "Din inkomst",
      2: "Dina utgifter",
      3: "Ditt sparande",
      4: "Dina skulder",
      5: "Slutför",
    },
    expenditure: {
      0: "Ta kontroll över dina utgifter",
      1: "Steg 1: Boende",
      2: "Steg 2: Räkningar",
      3: "Steg 3: Mat",
      4: "Steg 4: Transport",
      5: "Steg 5: Kläder",
      6: "Steg 6: Prenumerationer",
    },
  },
  en: {
    fallback: "Setup Wizard",
    wizard: {
      0: "",
      1: "Your income",
      2: "Your expenses",
      3: "Your savings",
      4: "Your debts",
      5: "Finish",
    },
    expenditure: {
      0: "Take control of your expenses",
      1: "Step 1: Housing",
      2: "Step 2: Bills",
      3: "Step 3: Food",
      4: "Step 4: Transport",
      5: "Step 5: Clothing",
      6: "Step 6: Subscriptions",
    },
  },
  et: {
    fallback: "Seadistamisviisard",
    wizard: {
      0: "",
      1: "Sinu sissetulek",
      2: "Sinu kulud",
      3: "Sinu säästud",
      4: "Sinu võlad",
      5: "Lõpeta",
    },
    expenditure: {
      0: "Võta oma kulud kontrolli alla",
      1: "Samm 1: Elamine",
      2: "Samm 2: Arved",
      3: "Samm 3: Toit",
      4: "Samm 4: Transport",
      5: "Samm 5: Riided",
      6: "Samm 6: Tellimused",
    },
  },
};

function pickLang(locale: string): "sv" | "en" | "et" {
  if (locale.startsWith("sv")) return "sv";
  if (locale.startsWith("et")) return "et";
  return "en";
}

const WizardHeading: React.FC<WizardHeadingProps> = ({ type, step }) => {
  const locale = useAppLocale();
  const lang = pickLang(locale);
  const dict = headings[lang];

  const text = dict[type][step] ?? dict.fallback;

  // Only step 0 in expenditure needs rich styling
  const isRichExpenditure0 = type === "expenditure" && step === 0;

  return (
    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
      {isRichExpenditure0 ? (
        <>
          {text.replace(/utgifter|expenses|kulud/i, "").trim()}{" "}
          <span className="font-extrabold text-darkLimeGreen underline text-3xl drop-shadow-md">
            {lang === "sv" ? "utgifter" : lang === "en" ? "expenses" : "kulud"}
          </span>
        </>
      ) : (
        text
      )}
    </h2>
  );
};

export default WizardHeading;
