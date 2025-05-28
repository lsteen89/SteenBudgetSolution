export function isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const [, payload] = token.split('.');
      const { exp } = JSON.parse(atob(payload));
      return Date.now() >= exp * 1000;       // true → expired
    } catch {
      return true;                           // malformed → treat as expired
    }
  }
  