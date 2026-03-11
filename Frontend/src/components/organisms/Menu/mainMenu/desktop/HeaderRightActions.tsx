import { ActionLink } from "@/components/atoms/UI/ActionLink";
import { LanguagePill } from "@/components/i18n/LanguagePill";
import { useAuth } from "@hooks/auth/useAuth";
import AccountMenu from "./AccountMenu";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { menuDict } from "@/utils/i18n/menu/Menu.i18n";
import { tDict } from "@/utils/i18n/translate";

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
        <LanguagePill />
        <AccountMenu />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex items-center gap-2">
        <ActionLink to="/registration" variant="primary" size="sm">
          {t("getStarted")}
        </ActionLink>

        <ActionLink
          to="/login"
          variant="secondary"
          size="sm"
          className="backdrop-blur" // keep if you really want blur for secondary
        >
          {t("login")}
        </ActionLink>
        <LanguagePill />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <ActionLink to="/dashboard" variant="primary" size="sm">
        {t("openApp")}
      </ActionLink>
      <LanguagePill />
      <AccountMenu />
    </div>
  );
}
