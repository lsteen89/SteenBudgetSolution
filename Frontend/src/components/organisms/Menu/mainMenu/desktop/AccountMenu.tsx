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
import { appRoutes } from "@/routes/appRoutes";
import { useAuth } from "@hooks/auth/useAuth";

type Labels = {
  button: string;
  dashboard: string;
  settings: string;
  support: string;
  logout: string;
};

type Props = {
  className?: string;
  labels: Labels;
};

export default function AccountMenu({ className, labels }: Props) {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAuthed = !!auth?.authenticated;

  if (!isAuthed) return null;

  const onLogout = async () => {
    await auth.logout("silent");
    navigate(appRoutes.home, { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 rounded-2xl px-4 font-semibold",
            "border border-eb-stroke/30 bg-eb-surface/75 backdrop-blur",
            "text-eb-text/80 hover:bg-eb-surfaceAccent/60 hover:text-eb-text",
            "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/35",
            "transition",
            className,
          )}
        >
          {labels.button}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "min-w-56 rounded-2xl p-2",
          "border border-eb-stroke/30 bg-eb-surface/95 backdrop-blur",
          "shadow-[0_18px_45px_rgba(21,39,81,0.16)]",
        )}
      >
        <DropdownMenuItem asChild className="rounded-xl">
          <Link to={appRoutes.dashboard} className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {labels.dashboard}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl">
          <Link
            to={appRoutes.dashboardSettings}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            {labels.settings}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl">
          <Link
            to={appRoutes.dashboardSupport}
            className="flex items-center gap-2"
          >
            <LifeBuoy className="h-4 w-4" />
            {labels.support}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-eb-stroke/30" />

        <DropdownMenuItem
          onClick={onLogout}
          className="rounded-xl text-[rgb(var(--eb-alert,239_68_68)/0.95)] focus:text-[rgb(var(--eb-alert,239_68_68)/0.95)]"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {labels.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
