import { UserDto } from './UserDto';

export interface LoginSuccessResponse {
  success: true;
  message: string;
}

export interface LoginFailureResponse {
  success: false;
  message: string;
}

export type LoginResponse = LoginSuccessResponse | LoginFailureResponse;

export interface AuthState {
  authenticated: boolean; // Whether the user is authenticated.
  email?: string; // For displaying the user's email.
  role?: string | null; // null for now now, but will be a string in the future.
  firstTimeLogin: boolean; // Whether the user is logging in for the first time.
  user?: UserDto; // The user's data.
}

export interface AuthContextType extends AuthState {
  refreshAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  fetchUserData: () => Promise<void>;

}