import React from "react";
import { flipCardFrontText, flipCardBackText } from "./flipCardTextContent";

interface FlipCardTextProps {
  variant: "front" | "back";
}

const FlipCardText: React.FC<FlipCardTextProps> = ({ variant }) => {
  return <>{variant === "front" ? flipCardFrontText : flipCardBackText}</>;
};

export default FlipCardText;
