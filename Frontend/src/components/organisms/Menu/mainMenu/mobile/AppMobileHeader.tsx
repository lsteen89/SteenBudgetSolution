import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
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
      { label: t("dashboard"), to: appRoutes.dashboard, tone: "primary" },
      { label: t("breakdown"), to: appRoutes.dashboardBreakdown },
      { label: t("howItWorks"), to: appRoutes.dashboardHowItWorks },
      { label: t("support"), to: appRoutes.support },
    ],
    [locale],
  );

  const onLogout = async () => {
    await auth.logout("silent");
    navigate(appRoutes.home, { replace: true });
  };

  const footer = (
    <button
      type="button"
      onClick={onLogout}
      className={cn(
        "h-11 w-full rounded-xl px-3 font-semibold",
        "border border-eb-stroke/30 bg-eb-surface",
        "text-[rgb(239_68_68/0.95)] hover:bg-[rgb(239_68_68/0.08)]",
        "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
      )}
    >
      {t("logout")}
    </button>
  );

  return (
    <MobileHeaderFrame
      brandTo={appRoutes.dashboard}
      brandAriaLabel={t("openDashboard")}
      items={items}
      footer={footer}
    />
  );
}
