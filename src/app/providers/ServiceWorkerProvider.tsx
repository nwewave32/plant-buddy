'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/shared/lib/registerSW';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
