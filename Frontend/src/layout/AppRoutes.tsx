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
const HomePage = lazy(() => import("@/Pages/public/Home/HomePage"));
const LoginPage = lazy(() => import("@/Pages/public/auth/LoginPage"));
const Registration = lazy(() => import("@/Pages/public/user/Registration"));
const EmailConfirmationPage = lazy(
  () => import("@/Pages/public/auth/EmailConfirmationPage"),
);
const AboutUs = lazy(() => import("@/Pages/public/info/AboutUs"));
const Faq = lazy(() => import("@/Pages/public/info/Faq"));
const NotFoundPage = lazy(() => import("@/Pages/public/info/NotFoundPage"));
const EmailVerificationRecoveryPage = lazy(
  () => import("@/Pages/public/auth/EmailVerificationRecoveryPage"),
);
const PasswordResetPage = lazy(
  () => import("@/Pages/public/auth/PasswordResetPage"),
);
const ForgotPasswordPage = lazy(
  () => import("@/Pages/public/auth/ForgotPasswordPage"),
);

// App (lazy)
const Dashboard = lazy(() => import("@/Pages/private/dashboard/dashboardhome"));
const DashboardBreakdownPage = lazy(
  () => import("@/Pages/private/dashboard/DashboardBreakdownPage"),
);
const HowItWorksPage = lazy(() => import("@/Pages/public/info/HowItWorksPage"));
const SettingsPage = lazy(
  () => import("@/Pages/private/settings/SettingsPage"),
);

// Support (protected)
const SupportPage = lazy(() => import("@/Pages/public/info/Contact"));

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
              <Route path="/settings" element={withLazy(<SettingsPage />)} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
