import React from "react";
import useMediaQuery from "@hooks/useMediaQuery";
import PublicMobileMenu from "@components/organisms/Menu/mainMenu/mobile/PublicMobileMenu";
import DesktopPublicMenu from "@/components/organisms/Menu/mainMenu/desktop/DesktopPublicMenu";

export default function PublicHeader() {
    const isDesktop = useMediaQuery("(min-width: 1280px)"); // xl
    return isDesktop ? <DesktopPublicMenu /> : <PublicMobileMenu />;
}
