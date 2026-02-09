import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AppHeaderResponsive from "@components/organisms/Menu/AppHeaderResponsive";
import UserSideMenu from "@components/organisms/Menu/sideMenu/UserSideMenu";

export default function AuthedLayout() {
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);

    useEffect(() => {
        const prev = document.documentElement.style.overflow;
        if (isUserMenuOpen) document.documentElement.style.overflow = "hidden";
        return () => {
            document.documentElement.style.overflow = prev;
        };
    }, [isUserMenuOpen]);

    return (
        <div className="min-h-screen">
            <AppHeaderResponsive onToggleUserMenu={() => setUserMenuOpen((v) => !v)} />
            <UserSideMenu
                isOpen={isUserMenuOpen}
                toggleMenu={() => setUserMenuOpen((v) => !v)}
            />
            <main className="pt-4 md:pt-6">
                <Outlet />
            </main>
        </div>
    );
}
