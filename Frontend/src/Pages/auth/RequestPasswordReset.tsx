import React, { useState } from "react";
import { generateResetPasswordEmail } from "@api/Services/User/generateResetPasswordEmail"; 
import SubmitButton from "../../components/atoms/buttons/SubmitButton";
import InputField from "@components/atoms/InputField/ContactFormInputField";
import { useNavigate } from "react-router-dom";
import ForgotPasswordBird from '@assets/Images/ForgotPasswordBird.png';
/* Toast */
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showToast } from "@utils/toastUtils";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        const response = await generateResetPasswordEmail(email);
        setMessage(response.message);
        showToast(response.message, "success", { autoClose: 8000 });
        
        setTimeout(() => {
            navigate("/");
        }, 8000); // Match success toast timing
    } catch (error: any) {
        const errorMessage =
            error.message.includes('429')
                ? 'Du har gjort för många försök. Vänta en stund och försök igen.'
                : error.message;

        setMessage(errorMessage);
        showToast(errorMessage, "error", { autoClose: 5000 });
    } finally {
        setIsSubmitting(false);
    }
};

  return (
    <div className="flex flex-col items-center min-h-screen pt-[25%] iphone-se:pt-10
    lg:pt-[15%] 
    2xl:pt-[15%]
    3xl:pt-[15%]
    ">
      {/* Bird Image */}
      <img 
        src={ForgotPasswordBird} 
        alt="ForgotPasswordBird" 
        className="absolute right-[3%] top-[45%] transform translate-y-[10%] w-auto max-w-[320px] z-10 hidden lg:block /* Visible for large screens */
          2xl:right-[10%] 2xl:top-[35%] 2xl:max-w-[400px]
          3xl:right-[1000px] 3xl:top-[35%] 3xl:max-w-[400px]"
      />    
      <h1 className="text-2xl font-bold mb-6">Glömt lösenord</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
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

      {/* Add ToastContainer here */}
      <ToastContainer />
      {/* Bird Image for iPads and Mobile */}
      <img
        src={ForgotPasswordBird}
        alt="ForgotPasswordBird"
        className="
        w-auto z-10
        lg:hidden /* Hide for large screens */
        block /* Visible for smaller screens */
        mt-6 /* Adds margin to push below container */"
      />
    </div>
  );  
};

export default ForgotPassword;
