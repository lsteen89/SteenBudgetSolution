import { AuthEventToasts } from "@/ui/auth/AuthEventToasts";
import { ToastProvider } from "@/ui/toast/toast";
import MediaQueryTest from "@components/Test/MediaQueryTest";
import DynamicTitle from "@utils/DynamicTitle";
import { Outlet } from "react-router-dom";

export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthEventToasts />
      <DynamicTitle />
      {import.meta.env.DEV ? <MediaQueryTest /> : null}
      <Outlet />
    </ToastProvider>
  );
}
