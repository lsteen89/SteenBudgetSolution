import SlidePanel from "@/components/atoms/overlays/SlidePanel";
import { cn } from "@/lib/utils";
import MobileBird from "@assets/Images/MobileBird.png";
import React, { useEffect, useId, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export type NavItem = {
  label: string;
  to: string;
  tone?: "primary" | "secondary"; // primary = green CTA
};

type Props = {
  brandTo: string;
  brandAriaLabel: string;

  items: NavItem[];
  footer?: React.ReactNode;

  /** optional: swap logo text, etc */
  brandLabel?: string;

  /** spacing */
  topOffsetPx?: number;
  panelClassName?: string;
};

export default function MobileHeaderFrame({
  brandTo,
  brandAriaLabel,
  brandLabel = "eBudget",
  items,
  footer,
  topOffsetPx = 84,
  panelClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const panelId = useId();

  // Close on route change
  useEffect(() => setOpen(false), [location.pathname]);

  // Scroll lock while open
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    if (open) document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const resolvedItems = useMemo(() => {
    // If no explicit primary, first item becomes primary
    const hasPrimary = items.some((x) => x.tone === "primary");
    if (hasPrimary) return items;
    return items.map((x, i) => (i === 0 ? { ...x, tone: "primary" } : x));
  }, [items]);

  return (
    <div className="lg:hidden">
      {/* Top Bar */}
      <div className="sticky top-0 z-50">
        <div className="border-b border-eb-stroke/25 bg-eb-surface/35 backdrop-blur-md">
          <div className="px-4">
            <div className="h-14 flex items-center justify-between">
              {/* Brand */}
              <Link
                to={brandTo}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35"
                aria-label={brandAriaLabel}
              >
                <img
                  src={MobileBird}
                  alt=""
                  draggable={false}
                  className="w-12 h-12 object-contain animate-img-pulse motion-reduce:animate-none"
                />
                <span className="font-extrabold tracking-tight text-eb-text">
                  {brandLabel}
                </span>
              </Link>

              {/* Hamburger morph */}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "relative flex justify-center items-center w-10 h-10 rounded-2xl",
                  "bg-eb-surface border border-eb-stroke/30 shadow-eb",
                  "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
                )}
                aria-label="Meny"
                aria-expanded={open}
                aria-controls={panelId}
              >
                <span
                  className={cn(
                    "absolute h-0.5 w-5 bg-eb-text/80 rounded",
                    "transform transition-transform duration-300 ease-in-out",
                    open ? "rotate-45" : "-translate-y-1.5",
                  )}
                />
                <span className="absolute h-0.5 w-5 bg-eb-text/80 rounded opacity-0" />
                <span
                  className={cn(
                    "absolute h-0.5 w-5 bg-eb-text/80 rounded",
                    "transform transition-transform duration-300 ease-in-out",
                    open ? "-rotate-45" : "translate-y-1.5",
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-down panel */}
      <SlidePanel
        isOpen={open}
        onClose={() => setOpen(false)}
        side="top"
        topOffsetPx={topOffsetPx}
        className={cn(
          "relative mx-4 mt-6 rounded-2xl bg-eb-surface/92 backdrop-blur-md",
          "border border-eb-stroke/30 shadow-eb p-3",
          panelClassName,
        )}
      >
        <div id={panelId}>
          <nav className="grid gap-2">
            {resolvedItems.map((it) => {
              const isPrimary = it.tone === "primary";
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "h-11 rounded-xl px-3 font-semibold",
                    "flex items-center justify-center",
                    "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
                    isPrimary
                      ? "bg-eb-accent text-white shadow-eb"
                      : "bg-eb-surface border border-eb-stroke/30 text-eb-text/80 hover:bg-eb-surfaceAccent/60 hover:text-eb-text",
                  )}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {footer ? (
            <div className="mt-3 pt-3 border-t border-eb-stroke/20">
              {footer}
            </div>
          ) : null}
        </div>
      </SlidePanel>
    </div>
  );
}
