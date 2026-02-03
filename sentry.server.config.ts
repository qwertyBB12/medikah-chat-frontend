// Sentry configuration for server-side error tracking
// This file configures the Sentry SDK for Node.js server environments

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Filter sensitive data before sending to Sentry
    beforeSend(event) {
      // Remove potential PHI from request data
      if (event.request?.data) {
        event.request.data = '[REDACTED]';
      }

      // Remove headers that might contain sensitive info
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-auth-token'];
      }

      // Sanitize breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
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
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'socket hang up',
    ],
  });
}
