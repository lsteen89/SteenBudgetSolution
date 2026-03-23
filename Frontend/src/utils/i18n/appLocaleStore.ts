import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/types/i18n/appLocale";

const KEY = "eb_locale";
const COOKIE_KEY = "eb_locale";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function detectFromNavigator(): AppLocale {
  const lang =
    (typeof navigator !== "undefined" ? navigator.language : "") || "";
  const lower = lang.toLowerCase();

  if (lower.startsWith("et")) return "et-EE";
  if (lower.startsWith("en")) return "en-US";
  return DEFAULT_APP_LOCALE;
}

let currentLocale: AppLocale | null = null;
const listeners = new Set<() => void>();

export function getAppLocale(): AppLocale {
  if (currentLocale) return currentLocale;

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(KEY);
    if (raw && isAppLocale(raw)) {
      currentLocale = raw;
      return currentLocale;
    }
  }

  const cookieValue = readCookie(COOKIE_KEY);
  if (cookieValue && isAppLocale(cookieValue)) {
    currentLocale = cookieValue;
    return currentLocale;
  }

  currentLocale = detectFromNavigator();
  return currentLocale;
}

export function setAppLocale(next: AppLocale) {
  currentLocale = next;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, next);
  }

  writeCookie(COOKIE_KEY, next);
  listeners.forEach((fn) => fn());
}

export function subscribeLocale(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
