import React, { createContext, useContext, useMemo, useRef } from "react";

type NavEvent = "nextHoverStart" | "nextHoverEnd" | "nextClick";

type Handler = () => void;

type Ctx = {
    subscribe: (event: NavEvent, handler: Handler) => () => void;
    emit: (event: NavEvent) => void;
};

const WizardNavEventsContext = createContext<Ctx | null>(null);

export function WizardNavEventsProvider({ children }: { children: React.ReactNode }) {
    const listenersRef = useRef<Record<NavEvent, Set<Handler>>>({
        nextHoverStart: new Set(),
        nextHoverEnd: new Set(),
        nextClick: new Set(),
    });

    const value = useMemo<Ctx>(() => {
        return {
            subscribe: (event, handler) => {
                listenersRef.current[event].add(handler);
                return () => listenersRef.current[event].delete(handler);
            },
            emit: (event) => {
                console.log("[WizardNavEvents] emit:", event);
                listenersRef.current[event].forEach((fn) => fn());
            },
        };
    }, []);

    return (
        <WizardNavEventsContext.Provider value={value}>
            {children}
        </WizardNavEventsContext.Provider>
    );
}

export function useWizardNavEvents() {
    const ctx = useContext(WizardNavEventsContext);
    if (!ctx) throw new Error("useWizardNavEvents must be used within WizardNavEventsProvider");
    return ctx;
}
