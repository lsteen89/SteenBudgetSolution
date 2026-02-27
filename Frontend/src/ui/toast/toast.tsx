import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: React.ReactNode;
  durationMs: number;
  createdAt: number;
};

type ShowOpts = {
  id?: string;
  durationMs?: number;
};

type ToastApi = {
  success: (message: React.ReactNode, opts?: ShowOpts) => void;
  error: (message: React.ReactNode, opts?: ShowOpts) => void;
  info: (message: React.ReactNode, opts?: ShowOpts) => void;
  dismiss: (id: string) => void;
  clear: () => void;
  showToast: (
    message: React.ReactNode,
    type: ToastVariant,
    durationMs?: number,
    id?: string,
  ) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

function defaultDuration(v: ToastVariant) {
  if (v === "error") return 6500;
  return 4500;
}

function iconFor(v: ToastVariant) {
  if (v === "success") return CheckCircle2;
  if (v === "error") return AlertTriangle;
  return Info;
}

function accentFor(v: ToastVariant) {
  if (v === "success") return "border-l-eb-accent text-eb-accent";
  if (v === "error") return "border-l-eb-danger text-eb-danger";
  return "border-l-[rgb(var(--eb-text)/0.35)] text-eb-text/70";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const show = React.useCallback(
    (variant: ToastVariant, message: React.ReactNode, opts?: ShowOpts) => {
      const id = opts?.id ?? `${variant}:${String(message)}`;
      const durationMs = opts?.durationMs ?? defaultDuration(variant);

      setItems((xs) => {
        // Prevent duplicates by id
        if (xs.some((x) => x.id === id)) return xs;
        return [
          ...xs,
          { id, variant, message, durationMs, createdAt: Date.now() },
        ].slice(-3); // keep max 3 stacked
      });

      // Auto-dismiss
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (m, o) => show("success", m, o),
      error: (m, o) => show("error", m, o),
      info: (m, o) => show("info", m, o),
      dismiss,
      clear,
      showToast: (message, type, durationMs, id) =>
        show(type, message, { durationMs, id }),
    }),
    [show, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function Toaster({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Use existing toast-root if you have it, else fall back to body
  const host = document.getElementById("toast-root") ?? document.body;

  const viewport = (
    <div
      className={cn(
        "fixed z-[9999] top-4 left-1/2 -translate-x-1/2",
        "w-[min(520px,calc(100vw-2rem))]",
        "space-y-3 pointer-events-none",
      )}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );

  return createPortal(viewport, host);
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = iconFor(item.variant);

  return (
    <div className="pointer-events-auto">
      <div
        role={item.variant === "error" ? "alert" : "status"}
        className={cn(
          "relative overflow-hidden",
          "rounded-2xl",
          "bg-eb-surface/85 backdrop-blur",
          "border border-eb-stroke/30 border-l-4",
          "shadow-[0_18px_40px_rgba(9,25,55,0.10)]",
          "px-4 py-3",
          "motion-reduce:transition-none",
          accentFor(item.variant),
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-eb-text">
              {item.variant === "success"
                ? "Klart"
                : item.variant === "error"
                  ? "Något gick fel"
                  : "Info"}
            </div>
            <div className="mt-0.5 text-sm text-eb-text/70 break-words">
              {item.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className={cn(
              "ml-2 inline-flex h-8 w-8 items-center justify-center",
              "rounded-xl",
              "text-eb-text/40 hover:text-eb-text/80",
              "hover:bg-[rgb(var(--eb-shell)/0.45)]",
              "focus-visible:outline-none focus-visible:ring-4 ring-eb-stroke/40",
            )}
            aria-label="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* subtle bottom progress bar */}
        <div className="mt-3 h-[3px] w-full rounded-full bg-[rgb(var(--eb-text)/0.08)]">
          <div
            className={cn(
              "h-full rounded-full",
              item.variant === "success"
                ? "bg-eb-accent/60"
                : item.variant === "error"
                  ? "bg-eb-danger/60"
                  : "bg-[rgb(var(--eb-text)/0.25)]",
            )}
            style={{
              width: "100%",
              animation: `toastShrink ${item.durationMs}ms linear forwards`,
            }}
          />
        </div>

        <style>{`
          @keyframes toastShrink {
            from { transform: scaleX(1); transform-origin: left; }
            to   { transform: scaleX(0); transform-origin: left; }
          }
        `}</style>
      </div>
    </div>
  );
}
