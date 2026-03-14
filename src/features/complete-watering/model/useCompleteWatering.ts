'use client';

import { useCallback, useState } from 'react';
import { completeWatering } from '../api/completeWatering';

export function useCompleteWatering(plantId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitWatering = useCallback(
    async (memo?: string, onSuccess?: () => void) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await completeWatering(plantId, memo);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('물주기 완료에 실패했습니다'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [plantId],
  );

  return { submitWatering, isSubmitting, error };
}
