import MobileBird from "@assets/Images/MobileBird.png";
import { useMemo } from "react";

import { ActionLink } from "@/components/atoms/UI/ActionLink";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { menuDict } from "@/utils/i18n/menu/Menu.i18n";
import { tDict } from "@/utils/i18n/translate";

import HeaderFrame from "./HeaderFrame";
import HeaderPillNav from "./HeaderPillNav";
import HeaderRightActions from "./HeaderRightActions";

export default function DesktopPublicMenu() {
  const locale = useAppLocale();
  const t = (k: keyof typeof menuDict.sv) => tDict(k, locale, menuDict);

  const items = useMemo(
    () => [
      { label: t("aboutUs"), to: appRoutes.aboutUs },
      { label: t("faq"), to: appRoutes.faq },
    ],
    [locale],
  );

  return (
    <HeaderFrame
      variant="public"
      left={
        <ActionLink
          to={appRoutes.home}
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
