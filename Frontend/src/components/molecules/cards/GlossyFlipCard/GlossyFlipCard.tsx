import React, { useState } from 'react';
import styles from './GlossyFlipCard.module.css'; // Import as a CSS module

interface GlossyFlipCardProps {
  frontText: string;
  backText: React.ReactNode; // Accepts JSX for advanced styling
  frontTextClass?: string;
  backTextClass?: string;
}

const GlossyFlipCard: React.FC<GlossyFlipCardProps> = ({
  frontText,
  backText,
  frontTextClass = "text-xl font-bold text-gray-800",
  backTextClass = "text-sm text-gray-600",
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={`${styles.cardWrapper} ${isFlipped ? styles.isFlipped : ''}`}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div className={styles.card}>
        <div className={styles.frontSide}>
          <p className={`${frontTextClass} ${styles.text}`}>{frontText}</p>
        </div>
        <div className={styles.backSide}>
          <p className={`${backTextClass} ${styles.text}`}>{backText}</p>
        </div>
      </div>
    </div>
  );
};

export default GlossyFlipCard;
