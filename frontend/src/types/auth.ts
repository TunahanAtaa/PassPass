/**
 * TypeScript definitions for Authentication and User models.
 * Matches backend schemas in app.schemas.auth.
 */

export interface UserResponse {
  id: string;
  email: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  vault_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthState {
  user: UserResponse | null;
  token: string | null;
  vaultToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<UserResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
