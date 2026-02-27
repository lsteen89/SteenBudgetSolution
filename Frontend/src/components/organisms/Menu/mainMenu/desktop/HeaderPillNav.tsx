import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHeaderPreset } from "@/components/organisms/Menu/hooks/useHeaderPreset";
import type { HeaderVariant } from "@/components/organisms/Menu/hooks/header.config";

type NavItem = { label: string; to: string };

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
                        className={({ isActive }) =>
                            cn(
                                "text-sm font-semibold rounded-full px-3 py-2",
                                "text-eb-text/70 hover:text-eb-text",
                                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
                                isActive ? preset.pill.activeClass : preset.pill.inactiveClass
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
