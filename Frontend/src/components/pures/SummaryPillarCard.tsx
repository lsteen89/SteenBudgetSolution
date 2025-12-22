import { motion } from "framer-motion";
import clsx from "clsx";
import { formatCurrencyParts } from "@/utils/money/currencyFormatter";
import { LucideProps } from "lucide-react";

interface Props {
  icon: IconType;
  title: string;
  amount: number;
  description: string;
}
type IconType = React.ComponentType<LucideProps>;
// Lucide icons are React components that accept size as a prop
const SummaryPillarCard: React.FC<Props> = ({
  icon: Icon,
  title,
  amount,
  description,
}) => {
  const { number, currency } = formatCurrencyParts(amount, /* alwaysSign */ false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-slate-800/40 backdrop-blur-md ring-1 ring-white/10
                 rounded-2xl p-5 flex flex-col items-center
                 text-center shadow-lg space-y-4 overflow-hidden"
    >
      <Icon size={36} className="text-darkLimeGreen shrink-0" />

      <h3 className="text-base sm:text-lg font-semibold tracking-wide text-white/90">
        {title}
      </h3>

      {/* signed amount */}
      <div className="flex flex-col items-center leading-tight">
        {/* big number – mobile-first scale */}
        <span
          className={clsx(
            "font-bold tracking-tight",
            "text-2xl sm:text-3xl md:text-4xl",
            amount >= 0 ? "text-green-400" : "text-red-400",
          )}
        >
          {number}
        </span>

        {/* currency token – always visible, much smaller */}
        <span className="text-xs sm:text-sm text-white/70">
          {currency}
        </span>
      </div>

      <p
        className="text-white/70 text-xs sm:text-sm line-clamp-3"
        title={description}        /* tooltip on hover for full text */
      >
        {description}
      </p>
    </motion.article>
  );
};

export default SummaryPillarCard;