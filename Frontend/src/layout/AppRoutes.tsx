// src/layout/AppRoutes.tsx (or wherever you keep it)
import React from "react";
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
import Dashboard from "@pages/dashboard/dashboardhome";

/* Auth */
import ProtectedRoute from "@routes/ProtectedRoute";

/* Debug (for email confirmation) */
import { mockVerifyEmail } from "@mocks/mockServices/verifyEmailMock";
import { realVerifyEmailWrapper } from "@api/Services/User/realVerifyEmailWrapper";

const isDebugMode = import.meta.env.MODE === "development";

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
        <Route path="/dashboard" element={<Dashboard />} />
        {/* add more private pages here the same way */}
      </Route>
      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
