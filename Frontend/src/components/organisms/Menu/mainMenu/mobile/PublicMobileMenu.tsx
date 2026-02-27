import React, { useMemo } from "react";
import MobileHeaderFrame, { NavItem } from "./MobileHeaderFrame";

export default function PublicMobileMenu() {
    const items: NavItem[] = useMemo(
        () => [
            { label: "Skaffa eBudget", to: "/registration", tone: "primary" },
            { label: "Logga in", to: "/login" },
            { label: "Vanliga frågor", to: "/faq" },
            { label: "Om oss", to: "/about-us" },
        ],
        []
    );

    return (
        <MobileHeaderFrame
            brandTo="/"
            brandAriaLabel="Gå till startsidan"
            items={items}
        />
    );
}
