export interface HealthResponse {
  status: string;
  app_name?: string;
  database?: 'connected' | 'disconnected' | string;
}

export interface ApiValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string | ApiValidationErrorDetail[];
}
