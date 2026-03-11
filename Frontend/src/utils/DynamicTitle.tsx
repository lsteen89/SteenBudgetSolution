import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appTitlesDict } from "@/utils/i18n/appTitles/AppTitles.i18n";
import { tDict } from "@/utils/i18n/translate";

type TitleKey = keyof typeof appTitlesDict.sv;

const pathToKey: Record<string, TitleKey> = {
  "/": "home",
  "/registration": "registration",
  "/check-email": "checkEmail",
  "/email-confirmation": "emailConfirmation",
  "/about-us": "aboutUs",
  "/forgotpassword": "forgotPassword",
  "/contact": "contact",
  "/faq": "faq",
  "/login": "login",
  "/reset-password": "resetPassword",
  "/dashboard": "dashboard",
  "/expenses": "expenses",
  "/dashboard/breakdown": "dashboardBreakdown",
  "/how-it-works": "howItWorks",
  "/email-verification-recovery": "emailConfirmationRecovery",
};

export default function DynamicTitle() {
  const location = useLocation();
  const locale = useAppLocale();

  const t = <K extends TitleKey>(k: K) => tDict(k, locale, appTitlesDict);

  useEffect(() => {
    const key = pathToKey[location.pathname] ?? "notFound";
    document.title = t(key);
  }, [location.pathname, locale]);

  return null;
}
