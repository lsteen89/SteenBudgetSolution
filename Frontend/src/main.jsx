import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import "./styles/loading.css";

// Create once (module scope)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    },
  },
});

// --- vh helper ---
// Sets --vh CSS variable to 1% of viewport height to help with mobile vh issues
// Usage: height: calc(var(--vh, 1vh) * 100);
const setVh = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
  document.documentElement.classList.add("vh-updated");
};

// Run once immediately to set initial value
setVh();

// Update on resize/orientation (dedupe listeners)
window.addEventListener("resize", setVh);
window.addEventListener("orientationchange", setVh);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
