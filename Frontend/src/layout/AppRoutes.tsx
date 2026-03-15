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
import { appRoutes } from "@/routes/appRoutes";

const isDebugMode = import.meta.env.DEV;

const withLazy = (el: React.ReactNode) => (
  <Suspense
    fallback={
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="rounded-3xl border border-eb-stroke/30 bg-eb-surface/80 p-5 backdrop-blur shadow-eb">
          <p className="text-sm text-eb-text/60">Laddar…</p>
        </div>
      </div>
    }
  >
    {el}
  </Suspense>
);

// Public
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
const HowItWorksPage = lazy(() => import("@/Pages/public/info/HowItWorksPage"));

// Private
const Dashboard = lazy(() => import("@/Pages/private/dashboard/dashboardhome"));
const DashboardBreakdownPage = lazy(
  () => import("@/Pages/private/dashboard/DashboardBreakdownPage"),
);
const SettingsPage = lazy(
  () => import("@/Pages/private/settings/SettingsPage"),
);

// Protected support
const SupportPage = lazy(() => import("@/Pages/private/support/SupportPage"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route element={<PublicLayout />}>
          <Route path={appRoutes.home} element={withLazy(<HomePage />)} />
          <Route path={appRoutes.login} element={withLazy(<LoginPage />)} />
          <Route
            path={appRoutes.registration}
            element={withLazy(<Registration />)}
          />
          <Route path={appRoutes.aboutUs} element={withLazy(<AboutUs />)} />
          <Route path={appRoutes.faq} element={withLazy(<Faq />)} />
          <Route
            path={appRoutes.howItWorksPublic}
            element={withLazy(<HowItWorksPage />)}
          />
          <Route
            path={appRoutes.forgotPassword}
            element={withLazy(<ForgotPasswordPage />)}
          />
          <Route
            path={appRoutes.resetPassword}
            element={withLazy(<PasswordResetPage />)}
          />
          <Route
            path={appRoutes.emailVerificationRecovery}
            element={withLazy(<EmailVerificationRecoveryPage />)}
          />
          <Route path="*" element={withLazy(<NotFoundPage />)} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AuthedLayout />}>
            <Route element={<OnboardingRoute />}>
              <Route
                path={appRoutes.emailConfirmation}
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
              <Route
                path={appRoutes.dashboard}
                element={withLazy(<Dashboard />)}
              />
              <Route
                path={appRoutes.dashboardBreakdown}
                element={withLazy(<DashboardBreakdownPage />)}
              />
              <Route
                path={appRoutes.dashboardHowItWorks}
                element={withLazy(<HowItWorksPage />)}
              />
              <Route
                path={appRoutes.dashboardSupport}
                element={withLazy(<SupportPage />)}
              />
              <Route
                path={appRoutes.dashboardSettings}
                element={withLazy(<SettingsPage />)}
              />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
