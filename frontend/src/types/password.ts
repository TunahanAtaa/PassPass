/**
 * TypeScript definitions for Password Vault entries.
 * Matches backend schemas in app.schemas.password.
 */

export interface PasswordListItem {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PasswordListResponse {
  items: PasswordListItem[];
  count: number;
}

export interface PasswordResponse {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  password: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PasswordCreateRequest {
  title: string;
  username?: string | null;
  url?: string | null;
  password?: string | null;
  notes?: string | null;
}

export interface PasswordUpdateRequest {
  title?: string | null;
  username?: string | null;
  url?: string | null;
  password?: string | null;
  notes?: string | null;
}
