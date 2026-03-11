import { cn } from "@/lib/utils";
import { useAuth } from "@hooks/auth/useAuth";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import MobileHeaderFrame, { NavItem } from "./MobileHeaderFrame";

export default function AppMobileMenu() {
  const auth = useAuth();
  const navigate = useNavigate();

  const items: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", to: "/dashboard", tone: "primary" },
      { label: "Support", to: "/support" },
      { label: "Breakdown", to: "/dashboard/breakdown" },
      { label: "How it works", to: "/how-it-works" },
    ],
    [],
  );

  const onLogout = async () => {
    await auth.logout("silent");
    navigate("/", { replace: true });
  };

  const footer = (
    <button
      type="button"
      onClick={onLogout}
      className={cn(
        "w-full h-11 rounded-xl px-3 font-semibold",
        "bg-eb-surface border border-eb-stroke/30",
        "text-[rgb(239_68_68/0.95)] hover:bg-[rgb(239_68_68/0.08)]",
        "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
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
