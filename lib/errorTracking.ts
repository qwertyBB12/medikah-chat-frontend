// Error tracking utility for Medikah
// Integrates with Sentry for production error monitoring

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry (called in _app.tsx)
export const initErrorTracking = (): void => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay for debugging (disabled for HIPAA)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Filter sensitive data
    beforeSend(event) {
      // Remove any potential PHI from error reports
      if (event.request?.data) {
        event.request.data = '[REDACTED]';
      }

      // Remove user emails from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data?.email) {
            breadcrumb.data.email = '[REDACTED]';
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Load failed',
      'ChunkLoadError',
    ],
  });
};

// Capture exception with context
export const captureException = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  Sentry.captureException(error, {
    extra: context,
  });
};

// Capture message
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void => {
  Sentry.captureMessage(message, level);
};

// Set user context (without PHI)
export const setUser = (userId: string | null): void => {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
};

// Add breadcrumb for debugging
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>
): void => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

// Create error boundary wrapper
export const ErrorBoundary = Sentry.ErrorBoundary;
