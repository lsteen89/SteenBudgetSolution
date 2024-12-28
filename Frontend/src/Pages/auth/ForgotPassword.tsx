import React, { useState } from "react";
import { resendVerificationEmail } from "@api/Services/User/resetPassword"; 
import SubmitButton from "../../components/atoms/buttons/SubmitButton";
import InputField from "@components/atoms/InputField/ContactFormInputField";
import { useNavigate } from "react-router-dom";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await resendVerificationEmail(email); 
      setMessage(response.message);

      // Redirect after showing the success message
      setTimeout(() => {
        navigate("/check-email");
      }, 2000);
    } catch (error: any) {
      // Handle validation or API errors
      if (error.name === "ValidationError") {
        setMessage(error.message); // Handle custom validation errors
      } else {
        setMessage("Något gick fel. Försök igen senare."); // General error message
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
      {message && <p className="mt-4 text-gray-700">{message}</p>}
    </div>
  );  
};

export default ForgotPassword;
