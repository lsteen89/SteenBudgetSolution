import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import AppRoutes from "@/layout/AppRoutes";
import { useAuthWs } from "@/hooks/auth/useAuthWs";

function AuthWsBridge() {
  useAuthWs();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthWsBridge />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
