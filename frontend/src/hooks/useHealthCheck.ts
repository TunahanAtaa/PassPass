import { useState, useEffect, useCallback } from 'react';
import { healthService } from '../services/health.service';
import type { HealthResponse } from '../types/api';

export interface UseHealthCheckReturn {
  data: HealthResponse | null;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
  refetch: () => Promise<void>;
}

export function useHealthCheck(): UseHealthCheckReturn {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await healthService.checkHealth();
      setData(response);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend server');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return {
    data,
    isLoading,
    error,
    lastChecked,
    refetch: fetchHealth,
  };
}
