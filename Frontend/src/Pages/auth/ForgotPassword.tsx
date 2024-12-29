import React, { useState } from "react";
import { resendVerificationEmail } from "@api/Services/User/resetPassword"; 
import SubmitButton from "../../components/atoms/buttons/SubmitButton";
import InputField from "@components/atoms/InputField/ContactFormInputField";
import { useNavigate } from "react-router-dom";

/* Toast */
import { ToastContainer, toast, ToastContentProps } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CustomToast from '@components/atoms/customToast/CustomToast';
import styles from '@components/atoms/customToast/CustomToast.module.css'; 

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  
  const TOAST_TIMINGS = {
    SUCCESS: 8000, // Boomer-friendly timing for success
    ERROR: 5000,   // Keep errors at 5 seconds
  };
  
  const showToast = (message: string, type: "success" | "error") => {
    toast(
      (toastProps: ToastContentProps) => (
        <CustomToast message={message} type={type} {...toastProps} />
      ),
      {
        autoClose: type === "success" ? TOAST_TIMINGS.SUCCESS : TOAST_TIMINGS.ERROR,
        className: styles.toastifyContainer,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const response = await resendVerificationEmail(email);
  
      // Success toast and navigate after delay
      showToast(response.message, "success");
      setTimeout(() => {
        navigate("/login"); // Redirect to the login page
      }, TOAST_TIMINGS.SUCCESS + 500); // Add some buffer after the toast
    } catch (error: any) {
      const errorMessage =
        error.name === "ValidationError"
          ? "Valideringsfel! Kontrollera din inmatning!"
          : "Internt fel! Försök igen senare!";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <ToastContainer
        hideProgressBar
        newestOnTop
        closeOnClick
        draggable={false}
        pauseOnFocusLoss={false}
        pauseOnHover={false}
        style={{ zIndex: 9999 }}
      />

      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-6">Glömt lösenord</h1>
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          {/* Email Input Field and Submit Button Container */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full">
              <InputField
                type="email"
                placeholder="Ange din epostadress"
                value={email}
                onChange={(e) => setEmail(e.target.value)} // Update email state
                width="100%"
              />
            </div>
            
            <div className="w-full flex justify-center">
              <SubmitButton
                isSubmitting={isSubmitting}
                label={isSubmitting ? "Skickar..." : "Återställ lösenord"}
                size="large"
                enhanceOnHover
                type="submit" // Trigger form submission
              />
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default ForgotPassword;
