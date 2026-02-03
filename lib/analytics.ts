// Analytics utility for Medikah
// Supports Google Analytics 4 and custom event tracking

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Google Analytics Measurement ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Check if analytics is enabled
export const isAnalyticsEnabled = (): boolean => {
  return typeof window !== 'undefined' && !!GA_MEASUREMENT_ID;
};

// Initialize Google Analytics
export const initGA = (): void => {
  if (!GA_MEASUREMENT_ID) return;

  // Add gtag script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    anonymize_ip: true, // HIPAA consideration
    allow_google_signals: false, // Disable demographic tracking for healthcare
    allow_ad_personalization_signals: false, // Disable ad personalization
  });
};

// Track page views
export const pageview = (url: string): void => {
  if (!isAnalyticsEnabled()) return;
  window.gtag?.('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  });
};

// Track custom events
interface EventParams {
  action: string;
  category: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

export const trackEvent = ({ action, category, label, value, ...rest }: EventParams): void => {
  if (!isAnalyticsEnabled()) return;
  window.gtag?.('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...rest,
  });
};

// Pre-defined events for Medikah
export const events = {
  // Waitlist
  waitlistSignup: (email: string) =>
    trackEvent({
      action: 'signup',
      category: 'waitlist',
      label: 'homepage',
    }),

  // Authentication
  loginAttempt: () =>
    trackEvent({
      action: 'login_attempt',
      category: 'auth',
    }),

  loginSuccess: () =>
    trackEvent({
      action: 'login_success',
      category: 'auth',
    }),

  // Chat
  chatStarted: () =>
    trackEvent({
      action: 'chat_started',
      category: 'engagement',
    }),

  messageSent: () =>
    trackEvent({
      action: 'message_sent',
      category: 'engagement',
    }),

  // Consent
  consentAccepted: (consentType: string) =>
    trackEvent({
      action: 'consent_accepted',
      category: 'compliance',
      label: consentType,
    }),

  // Navigation
  ctaClick: (ctaName: string, location: string) =>
    trackEvent({
      action: 'cta_click',
      category: 'navigation',
      label: `${ctaName}_${location}`,
    }),

  // Errors
  errorOccurred: (errorType: string, errorMessage: string) =>
    trackEvent({
      action: 'error',
      category: 'errors',
      label: `${errorType}: ${errorMessage}`,
    }),
};
