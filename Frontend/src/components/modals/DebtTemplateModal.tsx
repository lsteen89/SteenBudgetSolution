import React from "react";
import { motion } from "framer-motion";
// --- 1. Import the new icon ---
import { CreditCard, Car, X, PlusCircle, Users } from "lucide-react";
import { debtTemplates, DebtTemplate, DebtTemplateName } from "./debtTemplates";

interface DebtTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tpl: DebtTemplate) => void;
  onSelectBlank: () => void;
}

/* ---------- map icon safely ---------- */
const iconMap: Record<DebtTemplateName, JSX.Element> = {
  Kreditkort: <CreditCard className="h-8 w-8 text-darkLimeGreen" />,
  Billån: <Car className="h-8 w-8 text-darkLimeGreen" />,
  // --- 2. Add the new icon mapping ---
  Privatlån: <Users className="h-8 w-8 text-darkLimeGreen" />,
};

export const DebtTemplateModal: React.FC<DebtTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onSelectBlank,
}) => {
  if (!isOpen) return null;

  // --- 3. Helper function for description text ---
  const getTemplateDescription = (tpl: DebtTemplate) => {
    switch (tpl.type) {
      case "revolving":
        return `Minsta betalning ${tpl.minPayment!.toLocaleString("sv-SE")} kr`;
      case "installment":
        return `Löptid ${tpl.termMonths} mån`;
      case "private":
        return "Flexibel återbetalning";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-2xl rounded-2xl bg-[#1a1a1a] p-8 border border-white/20"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
          aria-label="Stäng"
        >
          <X size={24} />
        </button>

        <h3 className="mb-6 text-2xl font-bold text-white">Välj en mall för din skuld</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {debtTemplates.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => onSelect(tpl)}
              className="p-6 text-left transition rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
            >
              {iconMap[tpl.name]}
              <h4 className="mt-3 font-semibold text-white">{tpl.name}</h4>

              <p className="text-sm text-white/60">
                {getTemplateDescription(tpl)}
                {' · '}
                {tpl.apr}% · {tpl.balance.toLocaleString("sv-SE")} kr
              </p>
            </button>
          ))}

          {/* blank */}
          <button
            onClick={onSelectBlank}
            className="flex flex-col items-center justify-center p-6 transition border-2 border-dashed border-white/20 rounded-xl bg-transparent hover:bg-white/10 text-white/60 hover:text-white"
          >
            <PlusCircle size={32} />
            <span className="mt-3 font-semibold">Börja från noll</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};