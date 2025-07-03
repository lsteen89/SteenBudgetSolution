import { twMerge } from "tailwind-merge";

/**
 * cn – class-name concat + tailwind-merge.
 * Usage: cn("p-4", isRed && "text-red-500")
 */
export const cn = (...inputs: (string | false | null | undefined)[]) =>
  twMerge(inputs.filter(Boolean).join(" "));
