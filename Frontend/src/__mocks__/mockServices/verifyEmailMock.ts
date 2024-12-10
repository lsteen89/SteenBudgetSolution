export const mockVerifyEmail = async (token: string) => {
    console.log(`Mock verification called with token: ${token}`);
    if (token === 'debug-token-123') {
      return Promise.resolve();
    } else {
      throw new Error('Invalid token provided for debug.');
    }
  };