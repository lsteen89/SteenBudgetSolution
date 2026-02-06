import { getAppLocale, type AppLocale } from "@/utils/i18n/locale";

export function useAppLocale(): AppLocale {
    return getAppLocale(); // later: read from settings store
}
