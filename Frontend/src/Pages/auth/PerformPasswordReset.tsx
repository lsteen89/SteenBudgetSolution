import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import FormContainer from "@components/molecules/containers/FormContainer";
import InputField from "@components/atoms/InputField/ContactFormInputField";
import SubmitButton from "@components/atoms/buttons/SubmitButton";
import succesfulPassWordreset from "@assets/Images/LoginBird.png";
import failedPasswordReset from "@assets/Images/FailedPasswordResetBird.png";
import { resetPasswordWithToken } from "@api/Services/User/resetPasswordWithToken";
import { toast, ToastContainer } from "react-toastify";
import { showToast } from "@utils/toastUtils";
import { validatePassword } from "@utils/validation/PasswordValidation";
import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';
import { s } from "vite/dist/node/types.d-aGj9QkWt";


const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null); // Use null to defer initial rendering
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
 
  useEffect(() => {
    const isTestMode = process.env.NODE_ENV === "development";

    // Allow 'test-token' for development or validate real token
    if (isTestMode && token === "test-token") {
      setIsTokenValid(true);
      return;
    }

    // Validate token length (36-character UUID)
    setIsTokenValid(token?.length === 36);
  }, [token]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(validatePassword(value));
  };
  
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setConfirmPasswordError(value !== password ? "Lösenorden matchar inte!" : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    if (isSubmitting) {
      return;
    }
  
    setIsSubmitting(true);
  
    // Validate passwords
    const newPasswordError = validatePassword(password);
    const newConfirmPasswordError =
      password !== confirmPassword ? "Lösenorden matchar inte!" : null;
  
    setPasswordError(newPasswordError);
    setConfirmPasswordError(newConfirmPasswordError);
  
    if (newPasswordError || newConfirmPasswordError) {
      setIsSubmitting(false);
      return;
    }
  
    if (!isTokenValid) {
      setFormErrorMessage("Ogiltig eller saknad token!");
      setIsSubmitting(false);
      return;
    }
  
    try {
      const response = await resetPasswordWithToken(token as string, password);
      setFormErrorMessage(null); // Clear any existing error messages
      showToast("Lösenordet har återställts!\nNu kan du logga in med ditt nya lösenord!", "success", { autoClose: 8000 });
    
      setTimeout(() => {
        navigate("/login");
      }, 8000); // Match success toast timing
    } catch (error: any) {
      const errorMessage =
        error.message || "Något gick fel. Försök igen senare.";
      setFormErrorMessage(errorMessage); // Set the error message
    } finally {
      setIsSubmitting(false);
    }
  };
  


  if (isTokenValid === null) {
    return null; // Show nothing while determining token validity
  }

  return (
    <PageContainer
      centerChildren={true}>
      {/* Invalid link message outside of ContentWrapper */}
      {!isTokenValid && (
        <div className=" 
            pt-10
            lg:pt-[10%]
            3xl:pt-[0%]
            "
          >
          <div className="text-center mt-[10%]">
            <h1 className="text-2xl font-bold text-red-600">Ogiltig länk!</h1>
            <p className="mt-4">
              Vänligen dubbelkolla länken eller kontakta support för hjälp.
            </p>
          </div>
          <img
            src={failedPasswordReset}
            alt="failedPasswordReset"
            className="
              absolute w-auto max-w-xs top-[50%] 
              md:top-[40%] lg:max-w-[320px] lg:top-[35%] lg:left-[3%] lg:translate-y-[10%] lg:z-10
              2xl:left-[5%] 2xl:top-[20%] 2xl:max-w-[400px]
              3xl:left-[25%] 3xl:top-[30%] 3xl:max-w-[400px]

            "
          />
        </div>
      )}
  
      {/* ContentWrapper only renders for valid token */}
      {isTokenValid && (
        <ContentWrapper
          className="
            pt-[50%]
            md:pt-[0%]
            lg:pt-[30%]
            2xl:pt-[20%]
            3xl:pt-[5%]
          "
          centerContent={true}
        >
          <img
            src={succesfulPassWordreset}
            alt="succesfulPassWordreset"
            className="
              absolute w-auto max-w-xs top-[80%] 
              md:top-[60%] lg:max-w-[320px] lg:top-[45%] lg:left-[3%] lg:translate-y-[10%] lg:z-10
              2xl:left-[5%] 2xl:top-[20%] 2xl:max-w-[400px]
              3xl:left-[25%] 3xl:top-[30%] 3xl:max-w-[400px]

            "
          />
          <FormContainer
            className="animate-fade-in flex flex-col items-center z-10 transform -translate-y-1/2"
            bgColor="gradient"
            tag="form"
            onSubmit={handleSubmit}
          >
            <h1 className="text-3xl font-extrabold mb-6 text-center text-gray-800 tracking-wide md:text-4xl">
              Återställ ditt lösenord
            </h1>
  
            <InputField
              type="password"
              placeholder="Nytt lösenord"
              value={password}
              width="100%"
              onChange={(e) => handlePasswordChange(e.target.value)}
            />
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">{passwordError}</p>
            )}
            <InputField
              type="password"
              placeholder="Bekräfta lösenord"
              value={confirmPassword}
              width="100%"
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            />
            {confirmPasswordError && (
              <p className="text-red-500 text-sm mt-1">{confirmPasswordError}</p>
            )}
  
            <div className="flex justify-center mt-6">
              <SubmitButton
                isSubmitting={isSubmitting}
                label={isSubmitting ? "Skickar..." : "Återställ"}
                type="submit"
                enhanceOnHover
              />
            </div>
            {formErrorMessage && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-center">
                {formErrorMessage}
              </div>
            )}
          </FormContainer>
          <ToastContainer />
        </ContentWrapper>
      )}
    </PageContainer>
  );  
};

export default ResetPasswordPage;