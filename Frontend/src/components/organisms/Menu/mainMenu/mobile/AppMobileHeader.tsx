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

  const t = <K extends keyof typeof appMenuDict.sv>(key: K) =>
    tDict(key, locale, appMenuDict);

  const isAuthed = !!auth?.authenticated;
  if (!isAuthed) return null;

  const items: NavItem[] = useMemo(
    () => [
      { label: t("dashboard"), to: appRoutes.dashboard, tone: "primary" },
      { label: t("settings"), to: appRoutes.dashboardSettings },
      { label: t("support"), to: appRoutes.dashboardSupport },
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
      brandTo={appRoutes.dashboard}
      brandAriaLabel={t("openDashboard")}
      items={items}
      footer={footer}
    />
  );
}
