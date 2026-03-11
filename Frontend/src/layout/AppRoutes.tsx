import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import PublicLayout from "@/layout/PublicLayout";
import ProtectedRoute from "@routes/ProtectedRoute";
import AuthedLayout from "./AuthedLayout";
import RootLayout from "./RootLayout";

import {
  mockVerifyEmailCode,
  realVerifyEmailCodeWrapper,
} from "@/api/Services/User/verifyEmailCode.wrapper";
import ConfirmedRoute from "@/routes/ConfirmedRoute";
import OnboardingRoute from "@/routes/OnboardingRoute";

const isDebugMode = import.meta.env.DEV;

const withLazy = (el: React.ReactNode) => (
  <Suspense
    fallback={
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="rounded-3xl bg-eb-surface/80 backdrop-blur border border-eb-stroke/30 shadow-eb p-5">
          <p className="text-sm text-eb-text/60">Laddar…</p>
        </div>
      </div>
    }
  >
    {el}
  </Suspense>
);

// Public (lazy)
const HomePage = lazy(() => import("@pages/Home/HomePage"));
const LoginPage = lazy(() => import("@pages/auth/LoginPage"));
const Registration = lazy(() => import("@pages/user/Registration"));
const EmailConfirmationPage = lazy(
  () => import("@pages/auth/EmailConfirmationPage"),
);
const AboutUs = lazy(() => import("@pages/info/AboutUs"));
const Faq = lazy(() => import("@pages/info/Faq"));
const NotFoundPage = lazy(() => import("@pages/info/NotFoundPage"));
const EmailVerificationRecoveryPage = lazy(
  () => import("@pages/auth/EmailVerificationRecoveryPage"),
);
const PasswordResetPage = lazy(() => import("@pages/auth/PasswordResetPage"));
const ForgotPasswordPage = lazy(() => import("@pages/auth/ForgotPasswordPage"));

// App (lazy)
const Dashboard = lazy(() => import("@pages/dashboard/dashboardhome"));
const DashboardBreakdownPage = lazy(
  () => import("@pages/dashboard/DashboardBreakdownPage"),
);
const HowItWorksPage = lazy(() => import("@/Pages/info/HowItWorksPage"));

// Support (protected)
const SupportPage = lazy(() => import("@pages/info/Contact"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Public chrome */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={withLazy(<HomePage />)} />
          <Route path="/login" element={withLazy(<LoginPage />)} />
          <Route path="/registration" element={withLazy(<Registration />)} />
          <Route path="/about-us" element={withLazy(<AboutUs />)} />
          <Route path="/faq" element={withLazy(<Faq />)} />
          <Route path="/how-it-works" element={withLazy(<HowItWorksPage />)} />
          <Route
            path="/forgot-password"
            element={withLazy(<ForgotPasswordPage />)}
          />
          <Route
            path="/reset-password"
            element={withLazy(<PasswordResetPage />)}
          />
          <Route
            path="/email-verification-recovery"
            element={withLazy(<EmailVerificationRecoveryPage />)}
          />
          <Route
            path="/forgot-password"
            element={withLazy(<ForgotPasswordPage />)}
          />
          {/* 404 keeps the public header */}
          <Route path="*" element={withLazy(<NotFoundPage />)} />
        </Route>

        {/* Protected chrome */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthedLayout />}>
            <Route element={<OnboardingRoute />}>
              <Route
                path="/email-confirmation"
                element={withLazy(
                  <EmailConfirmationPage
                    verifyEmailCode={
                      isDebugMode
                        ? mockVerifyEmailCode
                        : realVerifyEmailCodeWrapper
                    }
                  />,
                )}
              />
            </Route>
            <Route element={<ConfirmedRoute />}>
              <Route path="/dashboard" element={withLazy(<Dashboard />)} />
              <Route
                path="/dashboard/breakdown"
                element={withLazy(<DashboardBreakdownPage />)}
              />
              <Route path="/support" element={withLazy(<SupportPage />)} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
