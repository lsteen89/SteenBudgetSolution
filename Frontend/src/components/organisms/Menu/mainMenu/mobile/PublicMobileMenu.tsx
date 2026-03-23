import { LanguagePill } from "@/components/i18n/LanguagePill";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { menuDict } from "@/utils/i18n/menu/Menu.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo } from "react";
import MobileHeaderFrame, { NavItem } from "./MobileHeaderFrame";

export default function PublicMobileMenu() {
  const locale = useAppLocale();
  const t = (k: keyof typeof menuDict.sv) => tDict(k, locale, menuDict);

  const auth = useAuth();
  const isAuthed = !!auth?.authenticated;

  const items: NavItem[] = useMemo(() => {
    if (isAuthed) {
      return [
        { label: t("openApp"), to: appRoutes.dashboard, tone: "primary" },
        { label: t("faq"), to: appRoutes.faq },
        { label: t("aboutUs"), to: appRoutes.aboutUs },
      ];
    }

    return [
      { label: t("getStarted"), to: appRoutes.registration, tone: "primary" },
      { label: t("login"), to: appRoutes.login },
      { label: t("faq"), to: appRoutes.faq },
      { label: t("aboutUs"), to: appRoutes.aboutUs },
    ];
  }, [isAuthed, locale]);

  const footer = !isAuthed ? (
    <div className="px-1">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-eb-text/50">
        {t("languageLabel")}
      </p>
      <LanguagePill fullWidth align="left" />
    </div>
  ) : null;

  return (
    <MobileHeaderFrame
      brandTo={isAuthed ? appRoutes.dashboard : appRoutes.home}
      brandAriaLabel={isAuthed ? t("openApp") : t("homeAria")}
      items={items}
      footer={footer}
    />
  );
}
