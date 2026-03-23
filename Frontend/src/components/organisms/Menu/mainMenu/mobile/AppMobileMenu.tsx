import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appMenuDict } from "@/utils/i18n/menu/AppMenu.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useAuth } from "@hooks/auth/useAuth";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeaderFrame, { NavItem } from "./MobileHeaderFrame";

export default function AppMobileHeader() {
  const auth = useAuth();
  const navigate = useNavigate();

  const locale = useAppLocale();
  const t = <K extends keyof typeof appMenuDict.sv>(k: K) =>
    tDict(k, locale, appMenuDict);

  const items: NavItem[] = useMemo(
    () => [
      { label: t("dashboard"), to: "/dashboard", tone: "primary" },
      { label: t("breakdown"), to: "/dashboard/breakdown" },
      { label: t("howItWorks"), to: "/how-it-works" },

      { label: t("support"), to: "/support" },
    ],
    [locale],
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
      {t("logout")}
    </button>
  );

  return (
    <MobileHeaderFrame
      brandTo="/dashboard"
      brandAriaLabel={t("openDashboard")}
      items={items}
      footer={footer}
    />
  );
}
