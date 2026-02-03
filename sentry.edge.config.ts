// Sentry configuration for Edge runtime (middleware, edge functions)

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring - lower sample rate for edge
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Filter sensitive data
    beforeSend(event) {
      if (event.request?.data) {
        event.request.data = '[REDACTED]';
      }
      return event;
    },
  });
}
