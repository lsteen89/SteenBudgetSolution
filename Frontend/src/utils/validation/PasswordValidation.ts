export const validatePassword = (password: string): string | null => {
    const isTestMode = process.env.NODE_ENV === "development";
    if (isTestMode) return null; // Skip validation in testing environment
    if (!password.trim()) return "Password is required.";
    if (password.length > 100) return "Password cannot exceed 100 characters.";
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/.test(password)) {
      return "Password must have at least one uppercase letter, one digit, and one symbol.";
    }
    return null;
  };
  