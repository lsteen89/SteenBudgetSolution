export const mockVerifyEmail = async (token: string): Promise<void> => {
  console.log(`Mock verifying email with token: ${token}`);
  
  if (token === 'debug-token-123') {
    // Simulate successful verification
    return Promise.resolve();
  } else {
    // Simulate an error
    throw new Error('Invalid token provided for debug.');
  }
};