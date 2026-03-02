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
  const toneClass =
    tone === "surface"
      ? "bg-eb-surface/80 border border-eb-stroke/40"
      : "bg-eb-shell/55 border border-eb-stroke/40";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl",
        blur && "backdrop-blur-md",
        toneClass,
        "shadow-eb",
        className,
      )}
      {...props}
    >
      {/* glass highlight */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/55" />
      <div className="relative">{children}</div>
    </div>
  );
}
