import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

/* Pages */
import HomePage from "@pages/Home/HomePage";
import LoginPage from "@pages/auth/LoginPage";
import Registration from "@pages/auth/Registration";
import CheckEmailPage from "@pages/auth/CheckEmailPage";
import EmailConfirmationPage from "@pages/auth/EmailConfirmationPage";
import AboutUs from "@pages/info/AboutUs";
import Contact from "@pages/info/Contact";
import Faq from "@pages/info/Faq";
import NotFoundPage from "@pages/info/NotFoundPage";
import RequestPasswordReset from "@pages/auth/RequestPasswordReset";
import ResetPasswordPage from "@pages/auth/PerformPasswordReset";


/* Auth */
import ProtectedRoute from "@routes/ProtectedRoute";

/* Debug (for email confirmation) */
import { mockVerifyEmail } from "@mocks/mockServices/verifyEmailMock";
import { realVerifyEmailWrapper } from "@api/Services/User/realVerifyEmailWrapper";

const isDebugMode = import.meta.env.MODE === "development";
const Dashboard = lazy(() => import("@pages/dashboard/dashboardhome"));
const DashboardBreakdownPage = lazy(() => import("@pages/dashboard/DashboardBreakdownPage"));


const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense
    fallback={
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-600">Laddar…</p>
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registration" element={<Registration />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route
        path="/email-confirmation"
        element={
          <EmailConfirmationPage
            verifyEmail={isDebugMode ? mockVerifyEmail : realVerifyEmailWrapper}
            debugToken={isDebugMode ? "debug-token-123" : undefined}
          />
        }
      />
      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/forgotpassword" element={<RequestPasswordReset />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>          {/* guard */}
        <Route path="/dashboard" element={<Lazy><Dashboard /></Lazy>} />
        <Route path="/dashboard/breakdown" element={<Lazy><DashboardBreakdownPage /></Lazy>} />
        {/* add more private pages here the same way */}
      </Route>
      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
