import React, { useState } from "react";
import styles from "./GlossyFlipCard.module.css";

interface GlossyFlipCardProps {
  frontText: React.ReactNode;
  backText: React.ReactNode;
  frontTextClass?: string;
  backTextClass?: string;
  disableBounce?: boolean;
  containerClassName?: string;
}

const GlossyFlipCard: React.FC<GlossyFlipCardProps> = ({
  frontText,
  backText,
  frontTextClass = "text-xl font-bold text-gray-800",
  backTextClass = "text-sm text-gray-600",
  disableBounce = true,
  containerClassName = "",
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleFlip = () => setIsFlipped((prev) => !prev);


  return (
    <div
      className={`
        ${styles.cardWrapper} cursor-pointer relative
        ${isFlipped ? styles.isFlipped : disableBounce ? "" : styles.mobileHintAnimation}
        ${containerClassName} 
      `}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={toggleFlip}
      role="button"
      aria-label="Flip card to see more information"

    >
      {/* Hint overlay */}
      {!isFlipped && (
        <>
          {/* Mobile hint */}
          <div
            className={`absolute bottom-2 right-2 px-2 py-1 bg-white/80 text-xs text-gray-700 rounded shadow-sm lg:hidden ${styles.fadeInSubtle}`}
          >
            Klicka för att flippa ↻
          </div>

          {/* Desktop hint */}
          <div
            className={`absolute bottom-2 right-2 px-2 py-1 bg-white/80 text-xs text-gray-700 rounded shadow-sm hidden lg:block ${styles.fadeInSubtle}`}
          >
            Hovra för att flippa ↻
          </div>
        </>
      )}

      <div className={styles.card}>
        <div className={styles.frontSide}>
          <div className={`${frontTextClass} ${styles.text}`}>{frontText}</div>
        </div>
        <div className={styles.backSide}>
          <div className={`${backTextClass} ${styles.text}`}>{backText}</div>
        </div>
      </div>
    </div>
  );
};

export default GlossyFlipCard;