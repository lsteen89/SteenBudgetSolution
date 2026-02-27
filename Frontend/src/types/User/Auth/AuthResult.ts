export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  persoId: string; // Guid serialized as string
  sessionId: string; // Guid serialized as string
  wsMac: string;
  rememberMe: boolean;
};
