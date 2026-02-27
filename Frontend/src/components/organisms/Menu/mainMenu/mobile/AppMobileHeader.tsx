import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@hooks/auth/useAuth";
import { cn } from "@/lib/utils";

import MobileHeaderFrame, { NavItem } from "./MobileHeaderFrame";

export default function AppMobileHeader() {
    const auth = useAuth();
    const navigate = useNavigate();

    const items: NavItem[] = useMemo(
        () => [
            { label: "Dashboard", to: "/dashboard", tone: "primary" },
            { label: "Breakdown", to: "/dashboard/breakdown" },
            { label: "How it works", to: "/dashboard/how-it-works" },
            { label: "Support", to: "/support" },
        ],
        []
    );

    const onLogout = async () => {
        try {
            await auth?.logout?.();
        } finally {
            navigate("/", { replace: true });
        }
    };

    const footer = (
        <button
            type="button"
            onClick={onLogout}
            className={cn(
                "w-full h-11 rounded-xl px-3 font-semibold",
                "bg-eb-surface border border-eb-stroke/30",
                "text-[rgb(239_68_68/0.95)] hover:bg-[rgb(239_68_68/0.08)]",
                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35"
            )}
        >
            Logga ut
        </button>
    );

    return (
        <MobileHeaderFrame
            brandTo="/dashboard"
            brandAriaLabel="Öppna dashboard"
            items={items}
            footer={footer}
        />
    );
}
