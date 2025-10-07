export interface AuthResult {
    accessToken: string;
    sessionId: string; // This is likely the user session, not wizard session
    persoId: string;
    rememberMe: boolean;
}