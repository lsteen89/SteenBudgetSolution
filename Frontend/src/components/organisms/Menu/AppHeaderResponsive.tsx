import React from "react";
import useMediaQuery from "@hooks/useMediaQuery";
import AppHeader from "./mainMenu/desktop/AppHeader";
import AppMobileHeader from "@components/organisms/Menu/mainMenu/mobile/AppMobileHeader";

type Props = { onToggleUserMenu: () => void };

export default function AppHeaderResponsive({ onToggleUserMenu }: Props) {
    const isDesktop = useMediaQuery("(min-width: 1280px)"); // xl
    return isDesktop
        ? <AppHeader />
        : <AppMobileHeader />;
}
