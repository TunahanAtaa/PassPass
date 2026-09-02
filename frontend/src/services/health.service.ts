import { apiClient } from '../lib/api-client';
import type { HealthResponse } from '../types/api';

/**
 * Health service to query FastAPI backend status.
 */
export const healthService = {
  /**
   * Fetches backend and database health status from /health
   */
  async checkHealth(): Promise<HealthResponse> {
    return apiClient<HealthResponse>('/health');
  },
};
