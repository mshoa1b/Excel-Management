'use client';

import { useEffect } from 'react';

export const useChunkErrorHandler = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if it's a chunk loading error
      if (
        error?.name === 'ChunkLoadError' || 
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module')
      ) {
        console.warn('Chunk loading error detected, reloading page...', error);
        
        // Prevent the error from being logged
        event.preventDefault();
        
        // Clear caches and reload
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
            (window as any).location.reload();
          });
        } else {
          (window as any).location.reload();
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      if (
        error?.name === 'ChunkLoadError' || 
        error?.message?.includes('Loading chunk') ||
        event.message?.includes('Loading chunk')
      ) {
        console.warn('Chunk loading error detected, reloading page...', error);
        
        // Clear caches and reload
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
            (window as any).location.reload();
          });
        } else {
          (window as any).location.reload();
        }
      }
    };

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Listen for general errors
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
};

export default useChunkErrorHandler;