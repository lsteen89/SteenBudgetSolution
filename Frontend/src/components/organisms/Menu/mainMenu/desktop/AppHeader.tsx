import { useMemo } from "react";
import { Link } from "react-router-dom";
import HeaderFrame from "./HeaderFrame";
import HeaderPillNav from "./HeaderPillNav";
import HeaderRightActions from "./HeaderRightActions";

export default function AppHeader() {
  const items = useMemo(
    () => [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Breakdown", to: "/dashboard/breakdown" },
      { label: "How it works", to: "/how-it-works" },
      { label: "Support", to: "/support" },
    ],
    [],
  );

  return (
    <HeaderFrame
      variant="app"
      left={
        <Link
          to="/dashboard"
          className="rounded-2xl px-2 py-1 font-extrabold tracking-tight text-eb-text
                     hover:text-eb-text/90 focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35"
          aria-label="Till dashboard"
        >
          eBudget
        </Link>
      }
      center={
        <HeaderPillNav variant="app" items={items} ariaLabel="App navigation" />
      }
      right={<HeaderRightActions mode="app" />}
    />
  );
}
