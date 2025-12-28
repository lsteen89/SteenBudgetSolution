import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { formatCurrency, formatCurrencyParts } from "@/utils/money/currencyFormatter";

interface FinalVerdictCardProps {
  balance: number;
}

const FinalVerdictCard: React.FC<FinalVerdictCardProps> = ({ balance }) => {
  const isSurplus = balance >= 0;
  const { number, currency } = formatCurrencyParts(balance);

  const wisdomText = isSurplus
    ? `Bra jobbat kompis! Du har ett överskott på ${formatCurrency(balance)} varje månad. Använd detta överskott klokt, du vet aldrig när du behöver det.`
    : `Dina utgifter överstiger dina intäkter med ${formatCurrency(Math.abs(balance))} varje månad. Du ska vara stolt över att du nu tar ett aktivt steg mot en bättre ekonomi, första steget är alltid det svåraste, och det har du tagit nu!`;

  return (
    <motion.div
      className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-8 text-center border border-white/10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2
        className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white/80 tracking-widest uppercase"
      >
        Ditt&nbsp;Månads<wbr />resultat
      </h2>

      <p
        className={clsx(
          "my-2 text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter",
          isSurplus ? "text-green-400" : "text-red-400",
        )}
      >
        {number}
        <span className="hidden md:inline">&nbsp;{currency}</span>
      </p>

      <p className="max-w-2xl mx-auto text-white/70 text-sm md:text-base">
        {wisdomText}
      </p>
    </motion.div>
  );
};

export default FinalVerdictCard;