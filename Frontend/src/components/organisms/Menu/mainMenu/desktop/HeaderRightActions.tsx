import { ActionLink } from "@/components/atoms/UI/ActionLink";
import { LanguagePill } from "@/components/i18n/LanguagePill";
import { useAuth } from "@hooks/auth/useAuth";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { menuDict } from "@/utils/i18n/menu/Menu.i18n";
import { tDict } from "@/utils/i18n/translate";

import AccountMenu from "./AccountMenu";

export default function HeaderRightActions({
  mode,
}: {
  mode: "public" | "app";
}) {
  const auth = useAuth();
  const isAuthed = !!auth?.authenticated;

  const locale = useAppLocale();
  const t = (k: keyof typeof menuDict.sv) => tDict(k, locale, menuDict);

  if (mode === "app") {
    return (
      <div className="flex items-center gap-2">
        <AccountMenu
          labels={{
            button: t("menuButton"),
            dashboard: t("dashboard"),
            settings: t("settings"),
            support: t("support"),
            logout: t("logout"),
          }}
        />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex items-center gap-2">
        <ActionLink to={appRoutes.registration} variant="primary" size="sm">
          {t("getStarted")}
        </ActionLink>

        <ActionLink
          to={appRoutes.login}
          variant="secondary"
          size="sm"
          className="backdrop-blur"
        >
          {t("login")}
        </ActionLink>

        <LanguagePill />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <ActionLink to={appRoutes.dashboard} variant="primary" size="sm">
        {t("openApp")}
      </ActionLink>

      <AccountMenu
        labels={{
          button: t("menuButton"),
          dashboard: t("dashboard"),
          settings: t("settings"),
          support: t("support"),
          logout: t("logout"),
        }}
      />
    </div>
  );
}
