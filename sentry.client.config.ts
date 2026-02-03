// Sentry configuration for client-side error tracking
// This file configures the Sentry SDK for browser environments

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay - DISABLED for HIPAA compliance
    // Do not capture user sessions in healthcare applications
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Filter sensitive data before sending to Sentry
    beforeSend(event) {
      // Remove potential PHI from request data
      if (event.request?.data) {
        event.request.data = '[REDACTED]';
      }

      // Sanitize breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          // Remove email addresses
          if (breadcrumb.data?.email) {
            breadcrumb.data.email = '[REDACTED]';
          }
          // Remove any medical-related data
          if (breadcrumb.data?.message) {
            breadcrumb.data.message = '[REDACTED]';
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.teletrax.net',
      'jigsaw is not defined',

      // Facebook
      'fb_xd_fragment',

      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,

      // Network errors (handled elsewhere)
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'ChunkLoadError',

      // Browser quirks
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],

    // Deny URLs (external scripts we don't control)
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
    ],
  });
}
