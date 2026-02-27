import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  show?: boolean;
  ok?: boolean;
  okText?: string;
  badText?: string;
  className?: string;
};

export function MatchHint({
  show = false,
  ok = false,
  okText = "Matchar",
  badText = "Matchar inte",
  className,
}: Props) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "mt-1 inline-flex items-center gap-2 text-xs font-semibold",
        ok ? "text-eb-accent" : "text-eb-alert",
        className
      )}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span>{ok ? okText : badText}</span>
    </div>
  );
}
