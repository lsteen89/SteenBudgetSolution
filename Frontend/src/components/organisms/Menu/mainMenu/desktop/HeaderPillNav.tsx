import type { HeaderVariant } from "@/components/organisms/Menu/hooks/header.config";
import { useHeaderPreset } from "@/components/organisms/Menu/hooks/useHeaderPreset";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";

export type NavItem = {
  label: string;
  to: string;
  end?: boolean;
};

export default function HeaderPillNav({
  variant,
  items,
  ariaLabel,
}: {
  variant: HeaderVariant;
  items: NavItem[];
  ariaLabel?: string;
}) {
  const preset = useHeaderPreset(variant);

  return (
    <nav aria-label={ariaLabel ?? "Navigation"}>
      <div className={preset.pill.wrapClass}>
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end ?? true}
            className={({ isActive }) =>
              cn(
                "rounded-full px-3 py-2 text-sm font-semibold",
                "text-eb-text/70 hover:text-eb-text",
                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
                isActive ? preset.pill.activeClass : preset.pill.inactiveClass,
              )
            }
          >
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
