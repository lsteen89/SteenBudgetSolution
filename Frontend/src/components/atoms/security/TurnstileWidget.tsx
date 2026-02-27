import { cn } from "@/lib/utils";
import * as React from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-eb-turnstile="1"]',
      ) as HTMLScriptElement | null;

      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(), { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.setAttribute("data-eb-turnstile", "1");
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Turnstile script failed to load"));
      document.head.appendChild(s);
    });
  }

  return turnstileScriptPromise;
}

type Props = {
  siteKey?: string;
  className?: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: (err?: unknown) => void;
};

export const TurnstileWidget = React.forwardRef<TurnstileWidgetHandle, Props>(
  ({ siteKey, className, onToken, onExpire, onError }, ref) => {
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const widgetIdRef = React.useRef<string | null>(null);

    const cbRef = React.useRef({ onToken, onExpire, onError });
    React.useEffect(() => {
      cbRef.current = { onToken, onExpire, onError };
    }, [onToken, onExpire, onError]);

    // prevent reset->callback->reset loops
    const resettingRef = React.useRef(false);

    React.useImperativeHandle(ref, () => ({
      reset: () => {
        const id = widgetIdRef.current;
        if (!id || !window.turnstile) return;

        if (widgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(widgetIdRef.current);
        }

        // break synchronous callback chains
        setTimeout(() => {
          try {
            window.turnstile?.reset(id);
          } finally {
            resettingRef.current = false;
          }
        }, 0);
      },
    }));

    React.useEffect(() => {
      let cancelled = false;

      async function init() {
        if (!siteKey) return;
        if (!hostRef.current) return;

        try {
          await loadTurnstileScript();
          if (cancelled) return;
          if (!window.turnstile)
            throw new Error("Turnstile not available on window");

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(hostRef.current, {
            sitekey: siteKey,
            callback: (token: string) => cbRef.current.onToken(token),
            "expired-callback": () => cbRef.current.onExpire?.(),
            "error-callback": (e: unknown) => cbRef.current.onError?.(e),
          });
        } catch (e) {
          if (!cancelled) cbRef.current.onError?.(e);
        }
      }

      void init();

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey]);

    if (!siteKey) {
      return (
        <div
          className={cn(
            "rounded-2xl p-4 bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 text-sm text-eb-text/65",
            className,
          )}
        >
          Turnstile saknar sitekey. Sätt{" "}
          <span className="font-semibold">VITE_TURNSTILE_SITE_KEY</span>.
        </div>
      );
    }

    return <div ref={hostRef} className={className} />;
  },
);

TurnstileWidget.displayName = "TurnstileWidget";
