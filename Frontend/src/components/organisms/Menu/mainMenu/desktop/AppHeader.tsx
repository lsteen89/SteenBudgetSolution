import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { appMenuDict } from "@/utils/i18n/menu/AppMenu.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import HeaderFrame from "./HeaderFrame";
import HeaderPillNav from "./HeaderPillNav";
import HeaderRightActions from "./HeaderRightActions";

export default function AppHeader() {
  const locale = useAppLocale();
  const t = <K extends keyof typeof appMenuDict.sv>(k: K) =>
    tDict(k, locale, appMenuDict);

  const items = useMemo(
    () => [
      { label: t("dashboard"), to: appRoutes.dashboard, end: true },
      { label: t("breakdown"), to: appRoutes.dashboardBreakdown, end: true },
      { label: t("howItWorks"), to: appRoutes.dashboardHowItWorks, end: true },
      { label: t("support"), to: appRoutes.support, end: true },
    ],
    [locale],
  );

  return (
    <HeaderFrame
      variant="app"
      left={
        <Link
          to={appRoutes.dashboard}
          className="rounded-2xl px-2 py-1 font-extrabold tracking-tight text-eb-text hover:text-eb-text/90 focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35"
          aria-label={t("toDashboard")}
        >
          eBudget
        </Link>
      }
      center={
        <HeaderPillNav
          variant="app"
          items={items}
          ariaLabel={t("appNavAria")}
        />
      }
      right={<HeaderRightActions mode="app" />}
    />
  );
}
