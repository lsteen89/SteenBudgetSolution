import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import MobileBird from "@assets/Images/MobileBird.png";

import HeaderFrame from "./HeaderFrame";
import HeaderPillNav from "./HeaderPillNav";
import HeaderRightActions from "./HeaderRightActions";
import { ActionLink } from "@/components/atoms/UI/ActionLink";

export default function DesktopPublicMenu() {
  const items = useMemo(
    () => [
      { label: "Om oss", to: "/about-us" },
      { label: "Vanliga frågor", to: "/faq" },
    ],
    []
  );

  return (
    <HeaderFrame
      variant="public"
      left={
        <ActionLink
          to="/"
          variant="ghost"
          size="xs"
          className="gap-2 font-extrabold tracking-tight hover:text-eb-text/90"
          aria-label="Till startsidan"
        >
          <img src={MobileBird} alt="" className="h-7 w-7 object-contain opacity-90" />
          <span>eBudget</span>
        </ActionLink>
      }
      center={<HeaderPillNav variant="public" items={items} ariaLabel="Primär navigation" />}
      right={<HeaderRightActions mode="public" />}
    />
  );
}
