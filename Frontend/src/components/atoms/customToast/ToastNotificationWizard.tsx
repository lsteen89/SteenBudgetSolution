import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ReactNode } from "react";

type ToastProps = {
  message: ReactNode; 
  type: "success" | "error";
  onClose: () => void;
  duration?: number; // default is 6000ms (6s)
};

const ToastNotification: React.FC<ToastProps> = ({ message, type, onClose, duration = 6000 }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // Update progress over time
  useEffect(() => {
    if (!message) return;
    let interval: NodeJS.Timeout;
    if (!isPaused) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - 100 / (duration / 100);
          return newProgress < 0 ? 0 : newProgress;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [message, isPaused, duration]);

  // Close the toast when progress reaches zero
  useEffect(() => {
    if (progress <= 0) {
      onClose();
    }
  }, [progress, onClose]);

  return (
<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000]">
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className={`w-[360px] px-6 py-4 rounded-xl shadow-2xl text-white text-center flex flex-col gap-2 
      ${type === "success" ? "bg-green-600" : "bg-red-600"}`}
    onMouseEnter={() => setIsPaused(true)}
    onMouseLeave={() => setIsPaused(false)}
  >
      {/* Icon, message text, and close button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {type === "success" ? "✅" : ""}
          <span className="text-lg font-semibold">{message}</span>
        </div>
        <button onClick={onClose} className="text-white text-lg font-bold hover:opacity-70">
          ❌
        </button>
      </div>

      {/* Auto-close progress bar */}
      <div className="w-full bg-white bg-opacity-20 rounded-full h-1">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
          className="h-1 bg-white rounded-full"
        />
      </div>
    </motion.div>
    </div>
  );
};

export default ToastNotification;
