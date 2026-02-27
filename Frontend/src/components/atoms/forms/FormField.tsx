import { cn } from "@/lib/utils";
import * as React from "react";

type Props = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-eb-text/80"
      >
        {label}
      </label>

      {children}

      {error ? (
        <p className="text-sm text-eb-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-eb-text/55">{hint}</p>
      ) : null}
    </div>
  );
}
