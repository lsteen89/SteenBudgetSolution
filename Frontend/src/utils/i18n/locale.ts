export type AppLocale = "sv-SE" | "en-US" | "et-EE";

const KEY = "eb_locale";
const COOKIE_KEY = "eb_locale";

function isAppLocale(x: string): x is AppLocale {
  return x === "sv-SE" || x === "en-US" || x === "et-EE";
}

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
  return "sv-SE";
}

// simple in-memory + subscription (no library needed)
let currentLocale: AppLocale | null = null;
const listeners = new Set<() => void>();

export function getAppLocale(): AppLocale {
  if (currentLocale) return currentLocale;

  // 1) localStorage
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(KEY);
    if (raw && isAppLocale(raw)) return (currentLocale = raw);
  }

  // 2) cookie fallback (optional)
  const c = readCookie(COOKIE_KEY);
  if (c && isAppLocale(c)) return (currentLocale = c);

  // 3) navigator default
  return (currentLocale = detectFromNavigator());
}

export function setAppLocale(next: AppLocale) {
  currentLocale = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, next);
  writeCookie(COOKIE_KEY, next); // keep or remove depending on BE needs
  listeners.forEach((fn) => fn());
}

export function subscribeLocale(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
