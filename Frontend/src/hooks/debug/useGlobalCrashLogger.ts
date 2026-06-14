import { useEffect } from "react";

export function useGlobalCrashLogger() {
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            console.error("🔥 window.onerror:", event.message);
            console.error(event.error);
        };

        const onRejection = (event: PromiseRejectionEvent) => {
            console.error("🔥 unhandledrejection:", event.reason);
        };

        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);

        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, []);
}
