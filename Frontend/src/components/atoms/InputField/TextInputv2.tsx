import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-2xl px-4",
          "bg-eb-surface/85 backdrop-blur",
          "border border-eb-stroke/30",
          "text-eb-text placeholder:text-eb-text/40",
          "shadow-[0_12px_30px_rgba(21,39,81,0.06)]",
          "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/30",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);

TextInput.displayName = "TextInput";
