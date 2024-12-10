import axios from '../../axiosConfig';

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
    const response = await axios.get<VerifyEmailResponse>(`/api/Registration/verify-email?token=${token}`);
    return response.data; 
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Invalid or expired token.';
    throw new Error(errorMessage);
  }
};
