const QUERY_KEY = "wizardProfiler";
const STORAGE_KEY = "ebudget.wizardProfiler";

type OverrideValue = "true" | "false";

declare global {
  interface Window {
    __WIZARD_PROFILER__?: boolean;
  }
}

function parseBool(input: string | null | undefined): boolean | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "off") {
    return false;
  }
  return null;
}

function readQueryOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  return parseBool(new URLSearchParams(window.location.search).get(QUERY_KEY));
}

function readStorageOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    return parseBool(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setWizardProfilerOverride(value: boolean | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const next: OverrideValue = value ? "true" : "false";
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // best effort only
  }
}

export function setWizardProfilerCodeOverride(
  value: boolean | undefined,
): void {
  if (typeof window === "undefined") return;
  window.__WIZARD_PROFILER__ = value;
}

export function isWizardProfilerEnabled(): boolean {
  const prodEnabled = import.meta.env.VITE_WIZARD_PROFILER === "true";
  const devEnabled = import.meta.env.DEV;

  const envDefault = devEnabled || prodEnabled;
  if (typeof window === "undefined") return envDefault;

  if (typeof window.__WIZARD_PROFILER__ === "boolean") {
    return window.__WIZARD_PROFILER__;
  }

  if (!devEnabled && !prodEnabled) {
    return false;
  }

  const queryOverride = readQueryOverride();
  if (queryOverride !== null) return queryOverride;

  const storageOverride = readStorageOverride();
  if (storageOverride !== null) return storageOverride;

  return envDefault;
}
