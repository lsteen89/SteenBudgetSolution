import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useToast } from "@/ui/toast/toast";
import * as React from "react";

export function AuthEventToasts() {
  const toast = useToast();
  const locale = useAppLocale();
  const event = useAuthStore((s) => s.authEvent);
  const setAuthEvent = useAuthStore((s) => s.setAuthEvent);

  React.useEffect(() => {
    if (!event) return;

    if (event.type === "session_expired") {
      const msg =
        locale === "sv-SE"
          ? "Din session har gått ut. Logga in igen."
          : locale === "et-EE"
            ? "Sinu seanss aegus. Palun logi uuesti sisse."
            : "Your session expired. Please sign in again.";

      toast.info(msg, { id: "auth:session-expired" });
    }

    setAuthEvent(null);
  }, [event, toast, setAuthEvent, locale]);

  return null;
}
