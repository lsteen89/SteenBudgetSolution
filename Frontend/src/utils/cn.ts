import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine conditional class names & let tailwind-merge
 * resolve duplicates (e.g. "p-4 p-6" ➜ "p-6").
 *
 * @example
 * <div className={cn("p-4", isError && "text-red-600")} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}