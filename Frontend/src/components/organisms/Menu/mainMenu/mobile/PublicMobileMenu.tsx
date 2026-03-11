import { LanguagePill } from "@/components/i18n/LanguagePill";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { menuDict } from "@/utils/i18n/menu/Menu.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo } from "react";
import MobileHeaderFrame, { NavItem } from "./MobileHeaderFrame";

export default function PublicMobileMenu() {
  const locale = useAppLocale();
  const t = (k: keyof typeof menuDict.sv) => tDict(k, locale, menuDict);
  const items: NavItem[] = useMemo(
    () => [
      { label: t("getStarted"), to: "/registration", tone: "primary" },
      { label: t("login"), to: "/login" },
      { label: t("faq"), to: "/faq" },
      { label: t("aboutUs"), to: "/about-us" },
    ],
    [locale],
  );

  return (
    <MobileHeaderFrame
      brandTo="/"
      brandAriaLabel={t("homeAria")}
      items={items}
      footer={
        <div className="px-1">
          <p className="mb-2 text-xs font-semibold tracking-[0.22em] uppercase text-eb-text/50">
            {t("languageLabel")}
          </p>
          <LanguagePill fullWidth align="left" />
        </div>
      }
    />
  );
}
