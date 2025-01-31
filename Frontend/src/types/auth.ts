export interface LoginSuccessResponse {
    success: true;
    message: string;
    accessToken: string;
    refreshToken: string;
  }
  
  export interface LoginFailureResponse {
    success: false;
    message: string;
  }
  
  export type LoginResponse = LoginSuccessResponse | LoginFailureResponse;

  export interface AuthState {
    authenticated: boolean;
    email?: string;
    role?: string | null;
  }
  
  export interface AuthContextType extends AuthState {
    refreshAuthStatus: () => Promise<void>;
    logout: () => Promise<void>;
  }