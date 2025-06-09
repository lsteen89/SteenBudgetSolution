import React from "react";
import useMediaQuery from '@hooks/useMediaQuery'; 
import { flipCardContentByPage, FlipCardPageKey, CardContent } from "./flipCardTextContent";

interface FlipCardTextProps {
  pageKey: FlipCardPageKey;
  variant: "front" | "back";
}

const FlipCardText: React.FC<FlipCardTextProps> = ({ pageKey, variant }) => {
  const isMdScreenOrUp = useMediaQuery('(min-width: 768px)');
  
  const contentGenerator: CardContent | undefined = flipCardContentByPage[pageKey];

  if (!contentGenerator) {
    console.warn(`FlipCardText: Content not found for pageKey "${pageKey}"`);
    return <>Textinnehåll saknas.</>;
  }


  const textFunction = variant === "front" ? contentGenerator.front : contentGenerator.back;


  const contentToRender = textFunction(isMdScreenOrUp);

  return <>{contentToRender}</>;
};

export default FlipCardText;