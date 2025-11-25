'use client';

import { useEffect } from 'react';

/**
 * Global error handler to suppress harmless Chrome extension connection errors.
 * These errors occur during wallet extension initialization and don't affect functionality.
 */
export default function ErrorHandler() {
  useEffect(() => {
    // Suppress unhandled promise rejections from extension communication
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || '';
      
      // Filter out harmless extension connection errors
      if (
        errorMessage.includes('Could not establish connection') ||
        errorMessage.includes('Receiving end does not exist') ||
        errorMessage.includes('Extension context invalidated')
      ) {
        // Suppress these harmless errors
        event.preventDefault();
        console.debug('Suppressed harmless extension connection error:', errorMessage);
        return;
      }
      
      // Let other errors through normally
    };

    // Suppress console errors from extension
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      if (
        errorMessage.includes('Could not establish connection') ||
        errorMessage.includes('Receiving end does not exist') ||
        errorMessage.includes('Extension context invalidated')
      ) {
        // Suppress these errors
        console.debug('Suppressed extension connection error:', errorMessage);
        return;
      }
      // Call original console.error for other errors
      originalError.apply(console, args);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalError;
    };
  }, []);

  return null;
}

