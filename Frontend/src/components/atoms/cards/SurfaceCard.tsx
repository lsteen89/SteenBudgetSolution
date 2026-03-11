import { cn } from "@/lib/utils";
import * as React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "surface" | "shell";
  blur?: boolean;
};

export function SurfaceCard({
  tone = "surface",
  blur = true,
  className,
  children,
  ...props
}: Props) {
  const toneBase =
    tone === "surface"
      ? "bg-eb-surface/85 border border-eb-stroke/40"
      : "bg-eb-shell/60 border border-eb-stroke/40";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-eb",

        // ✅ Always have a stable background (prevents “turning white”)
        toneBase,

        // ✅ Only blur where supported; never rely on it for readability
        blur && "supports-[backdrop-filter]:backdrop-blur-md",

        // Optional: slightly “glassier” only when blur is active + supported
        blur &&
          tone === "surface" &&
          "supports-[backdrop-filter]:bg-eb-surface/70",
        blur && tone === "shell" && "supports-[backdrop-filter]:bg-eb-shell/50",

        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          "bg-gradient-to-b",
          "from-[rgb(var(--eb-shell)/0.45)]",
          "via-[rgb(var(--eb-surface)/0.14)]",
          "to-transparent",
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[rgb(var(--eb-surface)/0.45)]" />

      <div className="relative">{children}</div>
    </div>
  );
}
