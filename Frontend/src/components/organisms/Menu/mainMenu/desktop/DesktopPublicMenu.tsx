import MobileBird from "@assets/Images/MobileBird.png";
import { useMemo } from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { menuDict } from "@/utils/i18n/menu/Menu.i18n";
import { tDict } from "@/utils/i18n/translate";

import { ActionLink } from "@/components/atoms/UI/ActionLink";
import HeaderFrame from "./HeaderFrame";
import HeaderPillNav from "./HeaderPillNav";
import HeaderRightActions from "./HeaderRightActions";

export default function DesktopPublicMenu() {
  const locale = useAppLocale();
  const t = (k: keyof typeof menuDict.sv) => tDict(k, locale, menuDict);
  const items = useMemo(
    () => [
      { label: t("aboutUs"), to: "/about-us" },
      { label: t("faq"), to: "/faq" },
    ],
    [locale], // REASON: Must trigger re-memoization on language change
  );

  return (
    <HeaderFrame
      variant="public"
      left={
        <ActionLink
          to="/"
          variant="ghost"
          size="xs"
          className="gap-2 font-extrabold tracking-tight hover:text-eb-text/90"
          aria-label={t("homeAria")}
        >
          <img
            src={MobileBird}
            alt=""
            className="h-7 w-7 object-contain opacity-90"
          />
          <span>eBudget</span>
        </ActionLink>
      }
      center={
        <HeaderPillNav
          variant="public"
          items={items}
          ariaLabel={t("navAria")}
        />
      }
      right={<HeaderRightActions mode="public" />}
    />
  );
}
