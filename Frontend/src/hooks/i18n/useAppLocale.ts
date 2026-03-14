import type { AppLocale } from "@/types/i18n/appLocale";
import { getAppLocale, subscribeLocale } from "@/utils/i18n/appLocaleStore";
import * as React from "react";

export function useAppLocale(): AppLocale {
  return React.useSyncExternalStore(
    subscribeLocale,
    getAppLocale,
    getAppLocale,
  );
}
