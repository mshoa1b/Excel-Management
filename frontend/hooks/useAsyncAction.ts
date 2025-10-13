'use client';

import { useCallback } from 'react';
import { useLoading } from '@/contexts/LoadingContext';

export const useAsyncAction = () => {
  const { setLoading } = useLoading();

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options?: {
      showGlobalLoader?: boolean;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T | undefined> => {
    const { showGlobalLoader = false, onSuccess, onError } = options || {};

    if (showGlobalLoader) {
      setLoading(true);
    }

    try {
      const result = await asyncFn();
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      if (onError) {
        onError(err);
      } else {
        console.error('Async action failed:', err);
      }
      throw err;
    } finally {
      if (showGlobalLoader) {
        // Small delay to ensure any navigation has started
        setTimeout(() => setLoading(false), 100);
      }
    }
  }, [setLoading]);

  return { executeAsync };
};