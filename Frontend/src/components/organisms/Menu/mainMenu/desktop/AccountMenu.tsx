import { LayoutDashboard, LifeBuoy, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@hooks/auth/useAuth";

type Props = {
  className?: string;
  buttonLabel?: string; // "Konto"
};

export default function AccountMenu({
  className,
  buttonLabel = "Konto",
}: Props) {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAuthed = !!auth?.authenticated;

  if (!isAuthed) return null;

  const onLogout = async () => {
    await auth.logout("silent");
    navigate("/", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 px-4 rounded-2xl font-semibold",
            "bg-eb-surface/75 backdrop-blur border border-eb-stroke/30",
            "text-eb-text/80 hover:bg-eb-surfaceAccent/60 hover:text-eb-text",
            "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
            "transition",
            className,
          )}
        >
          {buttonLabel}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "min-w-56 p-2 rounded-2xl",
          "bg-eb-surface/95 backdrop-blur",
          "border border-eb-stroke/30",
          "shadow-[0_18px_45px_rgba(21,39,81,0.16)]",
        )}
      >
        <DropdownMenuItem asChild className="rounded-xl">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl">
          <Link to="/account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Konto
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl">
          <Link to="/support" className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            Support
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-eb-stroke/30" />

        <DropdownMenuItem
          onClick={onLogout}
          className="rounded-xl text-[rgb(var(--eb-alert,239_68_68)/0.95)] focus:text-[rgb(var(--eb-alert,239_68_68)/0.95)]"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logga ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
