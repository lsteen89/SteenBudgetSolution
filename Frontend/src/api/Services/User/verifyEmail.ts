import { api } from '@/api/axios';
import translate from "@utils/translate";

/**
 * Response type for the verify email API call.
 */
interface VerifyEmailResponse {
  message: string; 
}

/**
 * Verify email address using token.
 * @param token - The verification token from the query parameter.
 * @returns A promise resolving to the API response data.
 * @throws An error with a descriptive message if the request fails.
 */
export const verifyEmail = async (token: string): Promise<VerifyEmailResponse> => {
  try {
    const response = await api.get<VerifyEmailResponse>(`/api/Registration/verify-email?token=${token}`);
    
    // Translate backend response message directly to Swedish
    const translatedMessage = translate(response.data.message);

    return {
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
