import { verifyEmail,  } from './verifyEmail'; // Adjust the path as necessary

export const realVerifyEmailWrapper = async (token: string): Promise<void> => {
  try {
    await verifyEmail(token);
    // Optionally, handle the response here if needed
    // For example, you can log the message or perform other side effects
  } catch (error) {
    // Re-throw the error to let the component handle it
    throw error;
  }
};