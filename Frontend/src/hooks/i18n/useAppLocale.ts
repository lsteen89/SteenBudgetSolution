import {
  getAppLocale,
  subscribeLocale,
  type AppLocale,
} from "@/utils/i18n/locale";
import * as React from "react";

export function useAppLocale(): AppLocale {
  return React.useSyncExternalStore(
    subscribeLocale,
    getAppLocale,
    getAppLocale,
  );
}
