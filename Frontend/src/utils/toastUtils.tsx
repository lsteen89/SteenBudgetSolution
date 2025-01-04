import { toast, ToastContentProps } from "react-toastify";
import CustomToast from "@components/atoms/customToast/CustomToast";
import styles from "@components/atoms/customToast/CustomToast.module.css";

type ToastType = "success" | "error";

interface ShowToastOptions {
  autoClose?: number; // Toast timing in milliseconds
  toastId?: string; // Prevent duplicate toasts
}

export const showToast = (
  message: string,
  type: ToastType,
  options: ShowToastOptions = {}
) => {
  const { autoClose = 5000, toastId = `${type}-${message}` } = options;

  toast(
    (toastProps: ToastContentProps) => (
      <CustomToast message={message} type={type} {...toastProps} />
    ),
    {
      autoClose, // Control timing dynamically
      className: styles.toastifyContainer, // Apply custom styles
      toastId, // Ensure duplicate toasts are prevented
    }
  );
};
