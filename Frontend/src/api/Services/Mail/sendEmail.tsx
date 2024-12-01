import axios from '../../axiosConfig'; // Use your custom axios instance
import { AxiosResponse } from 'axios'; // Import Axios types for stricter type checking
import { EmailSubmissionDto } from '../../../types/emailForm'; // Import TypeScript interface for email data



// Define TypeScript interface for the response
export interface EmailResponse {
  status: number; // HTTP status code (e.g., 200, 400, 500)
  message: string; // Response message from the backend
}

/**
 * Submit contact form data using the custom axios instance
 * @param {EmailData} emailData - The data to submit via the contact form
 * @returns {Promise<EmailResponse>} - Promise resolving to status and message
 */
export const sendEmail = async (
  emailData: EmailSubmissionDto
): Promise<EmailResponse> => {
  try {
    console.log('Request Method:', 'POST');
    console.log('Request URL:', 'http://localhost:5000/api/Email/ContactUs');
    // Use the custom axios instance to send a POST request
    const response: AxiosResponse<{ message: string }> = await axios.post(
      '/api/Email/ContactUs',
      emailData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return { status: response.status, message: response.data.message };
  } catch (error: any) {
    // Handle errors gracefully
    const status = error.response?.status || 500; // Default to 500 if no status
    const message =
      error.response?.data?.message || 'Failed to submit contact form';

    console.error('Error submitting contact form:', error);

    return { status, message }; // Return status and message for UI handling
  }
};
