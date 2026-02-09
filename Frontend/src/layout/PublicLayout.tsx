import React from "react";
import { Outlet } from "react-router-dom";
import PublicHeader from "@components/organisms/Menu/PublicHeader";

export default function PublicLayout() {
    return (
        <div className="min-h-screen">
            <PublicHeader />
            <main className="pt-4 md:pt-6">
                <Outlet />
            </main>
        </div>
    );
}
