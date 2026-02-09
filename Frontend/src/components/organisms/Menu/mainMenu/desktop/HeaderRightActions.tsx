import React from "react";
import { useAuth } from "@hooks/auth/useAuth";
import AccountMenu from "./AccountMenu";
import { ActionLink } from "@/components/atoms/UI/ActionLink";

export default function HeaderRightActions({ mode }: { mode: "public" | "app" }) {
    const auth = useAuth();
    const isAuthed = !!auth?.authenticated;

    if (mode === "app") return <AccountMenu />;

    if (!isAuthed) {
        return (
            <div className="flex items-center gap-2">
                <ActionLink to="/registration" variant="primary" size="sm">
                    Skaffa eBudget
                </ActionLink>

                <ActionLink
                    to="/login"
                    variant="secondary"
                    size="sm"
                    className="backdrop-blur" // keep if you really want blur for secondary
                >
                    Logga in
                </ActionLink>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <ActionLink to="/dashboard" variant="primary" size="sm">
                Öppna appen
            </ActionLink>
            <AccountMenu />
        </div>
    );
}
