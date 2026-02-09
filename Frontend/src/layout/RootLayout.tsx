import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { createPortal } from "react-dom";

import DynamicTitle from "@utils/DynamicTitle";
import ToastContext from "@context/ToastContext";
import ToastNotification from "@components/atoms/customToast/ToastNotificationWizard";
import MediaQueryTest from "@components/Test/MediaQueryTest";

export default function RootLayout() {
  const [toastMessage, setToastMessage] = useState<{
    text: React.ReactNode;
    type: "success" | "error";
    duration?: number;
    id: number;
  } | null>(null);

  const showToast = (
    text: React.ReactNode,
    type: "success" | "error",
    duration = 3000
  ) => setToastMessage({ text, type, duration, id: Date.now() });

  const toastRoot = typeof document !== "undefined" ? document.getElementById("toast-root") : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <DynamicTitle />
      {import.meta.env.DEV ? <MediaQueryTest /> : null}

      <Outlet />

      {toastMessage && toastRoot
        ? createPortal(
          <ToastNotification
            message={toastMessage.text}
            type={toastMessage.type}
            duration={toastMessage.duration}
            onClose={() => setToastMessage(null)}
          />,
          toastRoot
        )
        : null}
    </ToastContext.Provider>
  );
}
