import React, { useState } from 'react';
import styles from './FlipCard.module.css'; // Importing as a CSS Module

interface FlipCardProps {
  frontText: string;
  backText: string;
}

const FlipCard: React.FC<FlipCardProps> = ({ frontText, backText }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={`${styles.cardWrapper} ${isFlipped ? styles.isFlipped : ''}`}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div className={styles.card}>
        {/* Front Side */}
        <div className={styles.frontSide}>
          <p>{frontText}</p>
        </div>
        {/* Back Side */}
        <div className={styles.backSide}>
          <p>{backText}</p>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
