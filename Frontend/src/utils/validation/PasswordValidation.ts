export const validatePassword = (password: string): string | null => {
    const isTestMode = process.env.NODE_ENV === "development";
    if (isTestMode) return null; // Skip validation in testing environment
    if (!password.trim()) return "Lösenord måste anges!";
    if (password.length > 100) return "Lösenord kan inte vara längre än 100 tecken!";
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/.test(password)) {
      return "Lösenordet måste ha minst en stor bokstav, en siffra och en symbol!";
    }
    return null;
  };
  