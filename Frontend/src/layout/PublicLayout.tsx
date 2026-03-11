import PublicHeader from "@components/organisms/Menu/PublicHeader";
import { Outlet } from "react-router-dom";

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
