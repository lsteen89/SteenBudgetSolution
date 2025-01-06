import axios from "../../axiosConfig";
import { validatePassword } from "@utils/validation/PasswordValidation";
import translate from "@utils/translate";

interface ResetPasswordResponse {
  status: number;
  message: string;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const resetPasswordWithToken = async (
  token: string,
  newPassword: string
): Promise<ResetPasswordResponse> => {
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    // Translate validation error directly to Swedish
    throw new ValidationError(translate(passwordError));
  }

  try {
    const response = await axios.post<ResetPasswordResponse>(
      "/api/Auth/reset-password-with-token",
      { token, password: newPassword, confirmPassword: newPassword }
    );

    // Translate backend response message directly to Swedish
    const translatedMessage = translate(response.data.message);

    return {
      status: response.status,
      message: translatedMessage,
    };
  } catch (error: any) {
    const backendMessage = error.response?.data?.message || "UNKNOWN_ERROR";

    // Translate backend error message directly to Swedish
    const translatedMessage = translate(backendMessage);

    // Throw the translated message as the error
    throw new Error(translatedMessage);
  }
};
