/**
 * Phase 12 Plan 12-01: Bilingual content map for the Práctikah workspace surface.
 *
 * Centralized EN/ES strings for:
 *   - WorkspaceTabContainer (4 sub-tab labels)
 *   - MailboxTab, CalendarTab, SiteTab, SettingsTab
 *   - OnboardingWizard (TitlePicker, LocalPartPicker, PasswordStep, CompletionScreen)
 *
 * Per CLAUDE.md governance: every user-facing string must be bilingual EN/ES.
 * Brand spelling: "Práctikah" with accent on `á` (lowercase `c`).
 *
 * Usage:
 *   import { content } from '@/lib/practikahWorkspaceContent';
 *   const t = content[lang];
 */

export type WorkspaceLang = 'en' | 'es';

export interface ThemingContent {
  title: string;
  tabLayout: string;
  tabColors: string;
  tabTypography: string;
  tabPhotos: string;
  tabBrand: string;
  tabContent: string;
  savePending: string;
  saved: string;
  saveError: string;
  layout: {
    classic: { name: string; desc: string };
    editorial: { name: string; desc: string };
    minimal: { name: string; desc: string };
  };
  colors: { title: string; helper: string };
  fonts: { title: string; light: string; regular: string; bold: string };
  favicon: {
    title: string;
    helper: string;
    upload: string;
    remove: string;
    error: { size: string; mime: string; dim: string };
  };
  photos: {
    title: string;
    helper: string;
    add: string;
    remove: string;
    error: { size: string; mime: string; dim: string };
  };
  preview: { title: string; refresh: string; openInNewTab: string };
}

export interface TryProContactContent {
  title: string;
  subtitle: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Non-PHI disclaimer — prominent, not hidden. Must render clearly above the submit button. */
  disclaimer: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  required: {
    name: string;
    email: string;
    emailInvalid: string;
    subject: string;
    message: string;
  };
  maxLength: {
    subject: number;
    message: number;
  };
}

export interface WorkspaceContent {
  workspace: {
    title: string;
    subtitle: {
      mailbox: string;
      calendar: string;
      site: string;
      settings: string;
    };
  };
  theming: ThemingContent;
  mailbox: {
    address: { label: string };
    openButton: string;
    changePassword: string;
    quotaUsed: string;
    cardTitle: string;
    cardSubtitle: string;
    changePasswordCardTitle: string;
    changePasswordCardSubtitle: string;
    oldPasswordLabel: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    submit: string;
    saving: string;
    saved: string;
    error: string;
  };
  calendar: {
    caldavUrl: { label: string };
    copyUrl: string;
    copied: string;
    subscribeApple: string;
    subscribeGoogle: string;
    subscribeOutlook: string;
    cardTitle: string;
    instructionsTitle: string;
    appleSteps: string;
    googleSteps: string;
    outlookSteps: string;
    previewTitle: string;
    previewFallback: string;
  };
  site: {
    previewLabel: string;
    editTheme: string;
    openInNewTab: string;
    copyShareLink: string;
    toggleEnabled: string;
    toggleDisabled: string;
    cardTitle: string;
    cardSubtitle: string;
    notClaimedTitle: string;
    notClaimedBody: string;
    claimButton: string;
    claimDescription: string;
    claimSuccess: string;
  };
  settings: {
    imapHost: string;
    imapPort: string;
    smtpHost: string;
    smtpPort: string;
    username: string;
    password: { reveal: string; hide: string };
    mobileconfig: { button: string; subtitle: string };
    tfa: { title: string; enabled: string; notEnabled: string; deferralCopy: string };
    imapCardTitle: string;
    imapCardSubtitle: string;
    revealConfirmTitle: string;
    revealConfirmBody: string;
    revealConfirmYes: string;
    revealConfirmNo: string;
    /** Phase 12-03 additions for MailboxPasswordForm + SettingsTab wiring */
    passwordForm: {
      currentLabel: string;
      newLabel: string;
      confirmLabel: string;
      submit: string;
      submitting: string;
      success: string;
      error: string;
      errorWeak: string;
      errorNeedsMix: string;
      errorMismatch: string;
      strengthMeter: string;
      strengthWeak: string;
      strengthFair: string;
      strengthGood: string;
      strengthStrong: string;
    };
    imap: {
      title: string;
      host: string;
      imapPort: string;
      smtpPort: string;
      smtpStarttls: string;
      username: string;
      protocol: string;
      copy: string;
      copied: string;
      helpText: string;
    };
    mobileconfigCard: {
      title: string;
      description: string;
      button: string;
      error: string;
    };
    tfaCard: {
      title: string;
      notEnrolled: string;
      promptOnLogin: string;
      openMailboxPrompt: string;
    };
  };
  tryProContact: TryProContactContent;
  /** Phase 23 (PRES-03 / VOICE-08): Cue surface bilingual labels.
   *  cue.confirmLabel / cue.cancelLabel are used in CueActionCard.
   *  cue.surfacePlaceholder / cue.surfaceClose are for CueSurface chrome.
   */
  cue: {
    confirmLabel: string;
    cancelLabel: string;
    surfacePlaceholder: string;
    surfaceClose: string;
    surfaceLoading: string;
    surfaceError: string;
    /** Phase 23 Plan 23-04 (HANDS-09): Disconnect Cue section in SettingsTab. */
    disconnectTitle: string;
    disconnectSubtitle: string;
    disconnectButton: string;
    disconnectDone: string;
    disconnectError: string;
    /** Phase 23 Plan 23-04 (D-03): block/clear confirm-card copy. */
    confirmBlockTitle: string;
    confirmClearTitle: string;
  };
  /** Upgrade CTA banner + upgrade placeholder page strings (Phase 12-07 / D-20 / FREE-08)
   *
   * Phase 13-04 extends this namespace with `search` for the DomainSearch +
   * DefensiveSuggestions wizard step. Every visible string keyed here per
   * CLAUDE.md (bilingual EN/ES non-negotiable).
   */
  upgrade: {
    banner: {
      /** D-20 LOCKED copy — "Make this real at your own domain" */
      headline: string;
      body: string;
      cta: string;
      dismiss: string;
    };
    page: {
      headline: string;
      body: string;
      notify: string;
      done: string;
    };
    /** Phase 13-05 — UpgradeWizard shell (plan/review/checkout steps).
     *
     * Every visible string keyed here per CLAUDE.md (bilingual EN/ES
     * non-negotiable). Brand colors only — no hardcoded hex codes.
     */
    wizard: {
      headline: string;
      stepLabels: {
        satCheck: string;
        plan: string;
        domain: string;
        review: string;
        checkout: string;
        provisioning: string;
      };
      stepProgress: string;
      plan: {
        sectionTitle: string;
        sectionSubtitle: string;
        standardTitle: string;
        premiumTitle: string;
        cadenceAnnual: string;
        cadenceMonthly: string;
        cadenceLabel: string;
        annualSavings: string;
        valueBullets: string[];
        guarantee: string;
        continueCta: string;
      };
      review: {
        sectionTitle: string;
        sectionSubtitle: string;
        domainLabel: string;
        planLabel: string;
        cadenceLabel: string;
        totalLabel: string;
        backCta: string;
        confirmCta: string;
      };
      checkout: {
        handoffHeadline: string;
        handoffText: string;
        cta: string;
        loading: string;
        cancelledNotice: string;
      };
      provisioning: {
        placeholder: string;
        /** Phase 13-07 (D-16) — Vercel-style stepped checklist live UX */
        headline: string;
        subhead: string;
        /** Bilingual labels for the 7 PRO_SAGA_STEPS (matches PRO_SAGA_STEPS in services/practikah/pro_saga.py) */
        steps: {
          'pro.charge_confirmed': string;
          'pro.register_domain': string;
          'pro.write_dns': string;
          'pro.provision_mailcow_domain': string;
          'pro.provision_pro_mailbox': string;
          'pro.attach_saas_hostname': string;
          'pro.migrate_theme': string;
        };
        completedHeadline: string;
        completedCta: string;
        /** Phase 13-07 (D-15) — finish-later post-POR retry UX */
        finishLaterHeadline: string;
        finishLaterBody: string;
        /** Phase 13-07 — pre-POR failure UX (Stripe charge succeeded but the
         * saga aborted before pro.register_domain — card already refunded by
         * Stripe webhook reconciliation). */
        failedPreporHeadline: string;
        failedPreporBody: string;
        resolving: string;
        missingSession: string;
      };
      errors: {
        generic: string;
        network: string;
      };
    };
    /** Phase 13-04 / PRO-01 / PRO-02 / PRO-14 — DomainSearch + DefensiveSuggestions */
    search: {
      headline: string;
      subheadline: string;
      seedClinicLabel: string;
      seedClinicPlaceholder: string;
      freeformLabel: string;
      freeformPlaceholder: string;
      primaryHeading: string;
      defensiveHeading: string;
      defensiveSubheading: string;
      pricingWholesale: string;
      pricingService: string;
      pricingTotal: string;
      pricingNote: string;
      available: string;
      taken: string;
      checking: string;
      selectCta: string;
      reserveCta: string;
      showMore: string;
      showLess: string;
      empty: string;
      /** Reason badges — keys mirror SUGGESTION_REASON_KEYS in lib/domainSuggestions.ts */
      rules: {
        dr_lastname: string;
        dra_lastname: string;
        lastname_md: string;
        consultorio_lastname: string;
        first_last: string;
        paternal_maternal: string;
        clinic_name: string;
        freeform: string;
        defensive_com_mirror: string;
        defensive_consultorio: string;
        defensive_concat: string;
      };
    };
  };
  /** SAT compliance gate notice (Phase 13-03 / D-22 / D-23). Bilingual keys
   * are duplicated under each locale block so a single SATBlockedNotice
   * component can resolve the right copy regardless of which locale block
   * the caller selected. */
  sat: {
    blocked: {
      headline_en: string;
      headline_es: string;
      body_en: string;
      body_es: string;
      cta_notify_en: string;
      cta_notify_es: string;
    };
    unsupported: {
      headline_en: string;
      headline_es: string;
      body_en: string;
      body_es: string;
    };
  };
  wizard: {
    progress: string;
    title: {
      label: string;
      dr: string;
      drDisambig: string;
      dra: string;
      draDisambig: string;
      cardTitle: string;
      cardSubtitle: string;
      continue: string;
    };
    localPart: {
      title: string;
      subtitle: string;
      previewLabel: string;
      customLabel: string;
      customPlaceholder: string;
      availabilityChecking: string;
      availableLabel: string;
      takenLabel: string;
      invalidLabel: string;
      continue: string;
      pickFirst: string;
    };
    password: {
      title: string;
      subtitle: string;
      whyExplain: string;
      label: string;
      confirmLabel: string;
      strengthMeter: string;
      strengthWeak: string;
      strengthFair: string;
      strengthGood: string;
      strengthStrong: string;
      mismatch: string;
      tooShort: string;
      needsMix: string;
      submit: string;
      submitting: string;
      submitError: string;
    };
    completion: {
      headline: string;
      subhead: string;
      passwordReveal: string;
      copyPassword: string;
      copied: string;
      passwordWarning: string;
      openMailbox: string;
      openMailboxDesc: string;
      viewProfile: string;
      viewProfileDesc: string;
      tryProPreview: string;
      tryProPreviewDesc: string;
      imapAccordionTitle: string;
      goToSettings: string;
    };
  };
  /** Phase 13-09 — billing surfaces (DunningBanner / BillingCard /
   *  SubscriptionStatus / billing.tsx page). Per CLAUDE.md every visible
   *  string is bilingual EN/ES. Per D-27 the dunning copy is warm and
   *  non-judgmental. */
  billing: {
    pageHeading: string;
    pageSubtitle: string;
    statusActive: string;
    statusPastDue: string;
    statusGrace: string;
    statusCanceled: string;
    statusUnknown: string;
    expirationLabel: string;
    autoRenewOn: string;
    autoRenewOff: string;
    domainLabel: string;
    manageBillingCta: string;
    transferOutHeading: string;
    transferOutBody: string;
    transferOutCta: string;
    transferOutConfirm: string;
    transferOutSuccess: string;
    transferOutErrorGeneric: string;
    eppLabel: string;
    eppCopyCta: string;
    eppCopiedLabel: string;
    dnsRecordsHeading: string;
    dnsRecordsHelp: string;
    dunning: {
      retryHeadline: string;
      retryBody: string;
      graceHeadline: string;
      graceBody: string;
      ctaUpdatePayment: string;
    };
    freeRedirect: string;
  };
}

export const content: Record<WorkspaceLang, WorkspaceContent> = {
  en: {
    workspace: {
      title: 'Workspace',
      subtitle: {
        mailbox: 'Mailbox',
        calendar: 'Calendar',
        site: 'Site',
        settings: 'Settings',
      },
    },
    theming: {
      title: 'Edit Theme',
      tabLayout: 'Layout',
      tabColors: 'Colors',
      tabTypography: 'Typography',
      tabPhotos: 'Photos',
      tabBrand: 'Brand',
      tabContent: 'Content',
      savePending: 'Saving...',
      saved: 'All changes saved',
      saveError: 'Save failed — retry',
      layout: {
        classic: {
          name: 'Classic',
          desc: 'Traditional medical practice — top hero photo, services grid, credentials prominent, location card with map',
        },
        editorial: {
          name: 'Editorial',
          desc: 'Personality-forward — large narrative bio dominates, smaller services list, photo gallery as "moments"',
        },
        minimal: {
          name: 'Minimal',
          desc: 'Restrained portfolio — lots of whitespace, single-column flow, accent used sparingly',
        },
      },
      colors: {
        title: 'Accent Color',
        helper: 'All swatches WCAG-AA contrast verified',
      },
      fonts: {
        title: 'Font Weight',
        light: 'Light',
        regular: 'Regular',
        bold: 'Bold',
      },
      favicon: {
        title: 'Favicon',
        helper: 'Shown in browser tabs. PNG, SVG, ICO, or WebP. Min 64×64px, max 5 MB.',
        upload: 'Upload favicon',
        remove: 'Remove',
        error: {
          size: 'File must be under 5 MB.',
          mime: 'Accepted formats: PNG, SVG, ICO, WebP.',
          dim: 'Favicon must be at least 64×64 pixels.',
        },
      },
      photos: {
        title: 'Office Photos',
        helper: 'Up to 6 photos of your practice space. Min 1200×800px, max 5 MB each. PNG, JPEG, or WebP.',
        add: 'Add photo',
        remove: 'Remove',
        error: {
          size: 'Photo must be under 5 MB.',
          mime: 'Accepted formats: PNG, JPEG, WebP.',
          dim: 'Photo must be at least 1200×800 pixels.',
        },
      },
      preview: {
        title: 'Live preview',
        refresh: 'Refresh preview',
        openInNewTab: 'Open in new tab',
      },
    },
    mailbox: {
      address: { label: 'Your mailbox address' },
      openButton: 'Open Mailbox',
      changePassword: 'Change Password',
      quotaUsed: '{used} GB of 5 GB used',
      cardTitle: 'Your Práctikah Mailbox',
      cardSubtitle: 'Webmail opens in a new tab. Use IMAP credentials in Settings for native mail apps.',
      changePasswordCardTitle: 'Change Mailbox Password',
      changePasswordCardSubtitle: 'Your mailbox password is separate from your Medikah login.',
      oldPasswordLabel: 'Current password',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm new password',
      submit: 'Update password',
      saving: 'Saving...',
      saved: 'Password updated',
      error: 'Could not update password. Please try again.',
    },
    calendar: {
      caldavUrl: { label: 'Subscribe via CalDAV' },
      copyUrl: 'Copy URL',
      copied: 'Copied',
      subscribeApple: 'Apple Calendar',
      subscribeGoogle: 'Google Calendar',
      subscribeOutlook: 'Outlook Mobile',
      cardTitle: 'Your Práctikah Calendar',
      instructionsTitle: 'Subscribe on your device',
      appleSteps: 'On iPhone: Settings → Calendar → Accounts → Add Account → Other → Add CalDAV Account. Server: practikah.medikah.health. Username: your mailbox address. Password: your mailbox password.',
      googleSteps: 'Open Google Calendar settings → Add calendar → From URL → paste the CalDAV URL above. (Read-only on Google Calendar; full sync requires Apple Calendar or Outlook.)',
      outlookSteps: 'On Outlook Mobile: Settings → Add Mail Account → Add Email Account → Advanced → IMAP. The same credentials surface your calendar via CalDAV in supported clients.',
      previewTitle: 'Your calendar (read-only preview)',
      previewFallback: 'Calendar preview is coming in Phase 14. For now, subscribe via CalDAV using the URL above.',
    },
    site: {
      previewLabel: 'Preview',
      editTheme: 'Edit Theme',
      openInNewTab: 'Open in New Tab',
      copyShareLink: 'Copy Share Link',
      toggleEnabled: 'Site published',
      toggleDisabled: 'Site offline',
      cardTitle: 'Your Práctikah Profile Site',
      cardSubtitle: 'Your professional page at <slug>.medikah.health — included with your Práctikah workspace.',
      notClaimedTitle: 'Your profile site is ready',
      notClaimedBody: 'Your Práctikah workspace includes a professional profile site. Activate it, customize the appearance, and share it with patients and colleagues.',
      claimButton: 'Activate My Profile Site',
      claimDescription: 'Included with your workspace. Available immediately.',
      claimSuccess: 'Your profile site is live.',
    },
    settings: {
      imapHost: 'IMAP Host',
      imapPort: 'IMAP Port',
      smtpHost: 'SMTP Host',
      smtpPort: 'SMTP Port',
      username: 'Username',
      password: { reveal: 'Reveal once', hide: 'Hide' },
      mobileconfig: {
        button: 'Auto-configure iPhone',
        subtitle: 'Download a one-tap iOS profile that sets up Mail and Calendar with your credentials.',
      },
      tfa: {
        title: 'Two-factor authentication',
        enabled: 'Enabled',
        notEnabled: 'Not enabled',
        deferralCopy: 'Set up 2FA the next time you open Mailbox.',
      },
      imapCardTitle: 'IMAP Credentials',
      imapCardSubtitle: 'Connect Apple Mail, Outlook, or Gmail using these credentials.',
      revealConfirmTitle: 'Reveal mailbox password?',
      revealConfirmBody: "We will show your password once. Save it in your password manager — we don't store it anywhere you can see it again.",
      revealConfirmYes: 'Reveal once',
      revealConfirmNo: 'Cancel',
      passwordForm: {
        currentLabel: 'Current password',
        newLabel: 'New password (min. 12 characters)',
        confirmLabel: 'Confirm new password',
        submit: 'Update password',
        submitting: 'Updating...',
        success: 'Password updated successfully.',
        error: 'Could not update password. Please try again.',
        errorWeak: 'Password must be at least 12 characters.',
        errorNeedsMix: 'Use at least 3 of: lowercase, uppercase, number, symbol.',
        errorMismatch: 'Passwords do not match.',
        strengthMeter: 'Strength',
        strengthWeak: 'Weak',
        strengthFair: 'Fair',
        strengthGood: 'Good',
        strengthStrong: 'Strong',
      },
      imap: {
        title: 'IMAP / SMTP Connection Details',
        host: 'Host',
        imapPort: 'IMAP Port (SSL/TLS)',
        smtpPort: 'SMTP Port (SSL/TLS)',
        smtpStarttls: 'SMTP Port (STARTTLS)',
        username: 'Username',
        protocol: 'Security',
        copy: 'Copy',
        copied: 'Copied!',
        helpText: 'Use these details in Apple Mail, Outlook, or Gmail. Use the password you set above.',
      },
      mobileconfigCard: {
        title: 'Auto-configure iPhone / iPad',
        description: 'Download a one-tap iOS profile that sets up Mail and Calendar automatically.',
        button: 'Download iOS profile',
        error: 'Could not download the profile. Please try again.',
      },
      tfaCard: {
        title: 'Two-factor authentication',
        notEnrolled: 'Not yet enrolled',
        promptOnLogin: 'You will be prompted to set up 2FA the next time you open your mailbox.',
        openMailboxPrompt: 'Open Mailbox to set up 2FA',
      },
    },
    upgrade: {
      banner: {
        headline: 'Make this real at your own domain',
        body: 'Take your profile site to your own domain — your custom address, full ownership.',
        cta: 'See pricing',
        dismiss: 'Maybe later',
      },
      page: {
        headline: 'Práctikah Pro — coming soon',
        body: "We're finalizing Práctikah Pro. Custom domain setup and one-click migration of your profile site are launching soon. Want to be notified the moment it's available?",
        notify: 'Notify me',
        done: "Done — we'll notify you.",
      },
      wizard: {
        headline: 'Upgrade to Práctikah Pro',
        stepLabels: {
          satCheck: 'Eligibility',
          plan: 'Choose plan',
          domain: 'Pick domain',
          review: 'Review',
          checkout: 'Payment',
          provisioning: 'Setting up',
        },
        stepProgress: 'Step {current} of {total}',
        plan: {
          sectionTitle: 'Pick your Práctikah Pro plan',
          sectionSubtitle: 'Custom domain, Práctikah mailbox, and your profile site at your own address. 30-day money-back guarantee.',
          standardTitle: 'Standard',
          premiumTitle: 'Premium',
          cadenceAnnual: 'Annual',
          cadenceMonthly: 'Monthly',
          cadenceLabel: 'Billing cadence',
          annualSavings: 'Save vs monthly',
          valueBullets: [
            'Custom domain (you own it — fully transferable via EPP)',
            'Práctikah mailbox at your domain',
            'Your profile site at your own domain',
            'One-click migration of your current profile site',
            'Priority support during launch',
          ],
          guarantee: '30-day money-back guarantee — no questions asked.',
          continueCta: 'Continue',
        },
        review: {
          sectionTitle: 'Review your selection',
          sectionSubtitle: 'Confirm everything looks right before continuing to secure payment.',
          domainLabel: 'Domain',
          planLabel: 'Plan',
          cadenceLabel: 'Cadence',
          totalLabel: 'Charged today',
          backCta: 'Back',
          confirmCta: 'Continue to secure checkout',
        },
        checkout: {
          handoffHeadline: 'Secure checkout via Stripe',
          handoffText: 'Stripe handles your payment securely. We never see your card details. After payment, your domain and mailbox are set up automatically — usually in under 3 minutes.',
          cta: 'Continue to secure checkout',
          loading: 'Opening Stripe…',
          cancelledNotice: 'Payment cancelled — you can resume any time.',
        },
        provisioning: {
          placeholder: 'Provisioning your Pro workspace…',
          headline: 'Setting up your Pro workspace',
          subhead:
            "This usually takes about 3 minutes. You can leave this page open or close it — we'll email you the moment it's live.",
          steps: {
            'pro.charge_confirmed': 'Payment confirmed',
            'pro.register_domain': 'Registering your domain',
            'pro.write_dns': 'Configuring DNS records',
            'pro.provision_mailcow_domain': 'Setting up your mail domain',
            'pro.provision_pro_mailbox': 'Creating your custom mailbox',
            'pro.attach_saas_hostname': 'Issuing SSL certificate',
            'pro.migrate_theme': 'Migrating your website to your new domain',
          },
          completedHeadline: 'Your Pro workspace is live',
          completedCta: 'Visit my new site',
          finishLaterHeadline:
            "Your domain is registered — we're finishing setup",
          finishLaterBody:
            "We hit a small snag finishing setup, but your domain is yours and we're retrying automatically. We'll email you the moment it's live (usually within an hour).",
          failedPreporHeadline: "We couldn't complete your purchase",
          failedPreporBody:
            'Your card was not charged. Please try again or contact support if the issue persists.',
          resolving: 'Resolving your upgrade…',
          missingSession:
            'Missing checkout session — please return to the upgrade page.',
        },
        errors: {
          generic: 'Something went wrong starting checkout. Please try again.',
          network: 'Network error — please check your connection and try again.',
        },
      },
      search: {
        headline: 'Choose your professional domain',
        subheadline: "Pick the address patients will see. We'll set it up for you in under 3 minutes.",
        seedClinicLabel: 'Clinic name (optional)',
        seedClinicPlaceholder: 'e.g. Consultorio Cardiológico Lopez',
        freeformLabel: 'Or type your own',
        freeformPlaceholder: 'e.g. drlopez',
        primaryHeading: 'Suggested for you',
        defensiveHeading: 'Protect your brand — also reserve',
        defensiveSubheading: 'Common variations a competitor or squatter could grab. Add any to your plan with one click.',
        pricingWholesale: 'Domain (wholesale)',
        pricingService: 'Práctikah Pro service',
        pricingTotal: 'Total per year',
        pricingNote: 'Wholesale price comes directly from the registrar. The service fee covers email, website, and setup.',
        available: 'Available',
        taken: 'Taken',
        checking: 'Checking…',
        selectCta: 'Select',
        reserveCta: 'Reserve',
        showMore: 'Show more options',
        showLess: 'Show fewer',
        empty: 'Type a clinic name above or pick one of the suggestions to begin.',
        rules: {
          dr_lastname: 'Dr + your lastname',
          dra_lastname: 'Dra + your lastname',
          lastname_md: 'Lastname + MD',
          consultorio_lastname: 'Consultorio + lastname',
          first_last: 'First + lastname',
          paternal_maternal: 'Paternal + maternal',
          clinic_name: 'Your clinic name',
          freeform: "What you typed",
          defensive_com_mirror: '.com mirror of your top pick',
          defensive_consultorio: 'Consultorio variant',
          defensive_concat: 'First + lastname concat',
        },
      },
    },
    sat: {
      blocked: {
        headline_en: 'Práctikah Pro is launching in México soon',
        headline_es: 'Práctikah Pro estará disponible en México pronto',
        body_en:
          "We're completing tax compliance with the SAT (Servicio de Administración Tributaria) so we can collect IVA correctly on Mexican subscriptions. We'll email you the moment Pro is available — your free workspace stays fully active in the meantime.",
        body_es:
          'Estamos finalizando el cumplimiento fiscal con el SAT (Servicio de Administración Tributaria) para cobrar correctamente el IVA en suscripciones mexicanas. Te avisaremos por correo en cuanto Pro esté disponible — mientras tanto, tu espacio gratuito sigue completamente activo.',
        cta_notify_en: 'Notify me when Pro launches in México',
        cta_notify_es: 'Avísame cuando Pro esté disponible en México',
      },
      unsupported: {
        headline_en: "Práctikah Pro isn't available in your country yet",
        headline_es: 'Práctikah Pro aún no está disponible en tu país',
        body_en:
          "We're currently launching in México and the United States. Your free workspace works the same anywhere — we'll expand to more countries soon.",
        body_es:
          'Estamos lanzando inicialmente en México y Estados Unidos. Tu espacio gratuito funciona igual en cualquier país — pronto expandiremos a más regiones.',
      },
    },
    tryProContact: {
      title: 'Contact',
      subtitle: 'Have a general question? Send a message.',
      name: 'Your name',
      email: 'Your email',
      subject: 'Subject',
      message: 'Message',
      disclaimer:
        'Please do not include medical or personal health information. For clinical questions, use the Medikah patient inquiry channel.',
      submit: 'Send message',
      submitting: 'Sending...',
      success: 'Message sent. The physician will be in touch.',
      error: 'Could not send message. Please try again.',
      required: {
        name: 'Name is required.',
        email: 'Email is required.',
        emailInvalid: 'Please enter a valid email address.',
        subject: 'Subject is required.',
        message: 'Message is required.',
      },
      maxLength: {
        subject: 120,
        message: 800,
      },
    },
    /** Phase 23 (PRES-03 / VOICE-08): Cue surface strings — EN */
    cue: {
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      surfacePlaceholder: 'Ask Cue anything about your calendar…',
      surfaceClose: 'Close',
      surfaceLoading: 'Cue is thinking…',
      surfaceError: 'Something went wrong. Please try again.',
      disconnectTitle: 'Disconnect Cue',
      disconnectSubtitle:
        'Revoke Cue’s access to your calendar and inbox. This removes only Cue’s app password — your mailbox login is untouched. You can reconnect any time.',
      disconnectButton: 'Disconnect Cue',
      disconnectDone: 'Cue disconnected.',
      disconnectError: 'Could not disconnect Cue. Please try again.',
      confirmBlockTitle: 'Block this time?',
      confirmClearTitle: 'Clear Cue blocks?',
    },
    wizard: {
      progress: 'Step {n} of 3',
      title: {
        label: 'Choose your honorific',
        dr: 'Dr',
        drDisambig: 'Doctor (masculine honorific)',
        dra: 'Dra',
        draDisambig: 'Doctora (feminine honorific)',
        cardTitle: "Let's set up your Práctikah workspace",
        cardSubtitle: 'How should we address you on your mailbox and site?',
        continue: 'Continue',
      },
      localPart: {
        title: 'Pick your mailbox address',
        subtitle: 'This is the address patients will see. You can change it later by contacting support.',
        previewLabel: 'Your mailbox will be',
        customLabel: 'Or write your own',
        customPlaceholder: 'e.g. dr-lopez',
        availabilityChecking: 'Checking availability...',
        availableLabel: 'available',
        takenLabel: 'taken',
        invalidLabel: 'invalid',
        continue: 'Continue',
        pickFirst: 'Please pick an available address to continue.',
      },
      password: {
        title: 'Set your mailbox password',
        subtitle: 'Your mailbox password is separate from your Medikah login.',
        whyExplain: "Your mailbox lives on its own server for security and portability — Práctikah doesn't store this password.",
        label: 'New mailbox password',
        confirmLabel: 'Confirm password',
        strengthMeter: 'Password strength',
        strengthWeak: 'Weak',
        strengthFair: 'Fair',
        strengthGood: 'Good',
        strengthStrong: 'Strong',
        mismatch: 'Passwords do not match.',
        tooShort: 'Password must be at least 12 characters.',
        needsMix: 'Use at least 3 of: lowercase, uppercase, number, symbol.',
        submit: 'Create my mailbox',
        submitting: 'Provisioning...',
        submitError: 'Could not provision your mailbox. Please try again.',
      },
      completion: {
        headline: "You're on Práctikah!",
        subhead: 'Welcome, Dr. {firstName}',
        passwordReveal: 'Your mailbox password (shown once)',
        copyPassword: 'Copy password',
        copied: 'Copied',
        passwordWarning: "Save this now — we don't store it.",
        openMailbox: 'Open Mailbox',
        openMailboxDesc: 'Webmail at practikah.medikah.health',
        viewProfile: 'View Your Profile',
        viewProfileDesc: 'Your Medikah profile page',
        tryProPreview: 'Profile Site',
        tryProPreviewDesc: 'Your Práctikah web presence',
        imapAccordionTitle: 'IMAP credentials (for Apple Mail / Outlook / Gmail)',
        goToSettings: 'Open Settings',
      },
    },
    billing: {
      pageHeading: 'Billing',
      pageSubtitle: 'Manage your Pro subscription, custom domain, and DNS records.',
      statusActive: 'Active',
      statusPastDue: 'Payment retrying',
      statusGrace: 'Grace period',
      statusCanceled: 'Canceled',
      statusUnknown: 'Unknown',
      expirationLabel: 'Renews on {date}',
      autoRenewOn: 'Auto-renewal on',
      autoRenewOff: 'Auto-renewal off',
      domainLabel: 'Your domain',
      manageBillingCta: 'Manage billing',
      transferOutHeading: 'Transfer your domain out',
      transferOutBody: "Your domain is yours. Request the EPP transfer code and we'll deliver it instantly to your email and on this page — paste it at any registrar to bring your domain elsewhere.",
      transferOutCta: 'Transfer my domain out',
      transferOutConfirm: "We'll generate your EPP transfer authorization code now. Continue?",
      transferOutSuccess: 'Here is your EPP code — paste it at the gaining registrar within 30 days.',
      transferOutErrorGeneric: "We couldn't issue the EPP code right now. Please retry in a moment.",
      eppLabel: 'EPP code',
      eppCopyCta: 'Copy code',
      eppCopiedLabel: 'Copied',
      dnsRecordsHeading: 'DNS records (read-only)',
      dnsRecordsHelp: "These records keep your custom domain working. Full self-service editing is on the roadmap; for now, contact us for changes.",
      dunning: {
        retryHeadline: "Let's keep your Pro workspace going",
        retryBody: "Your last payment didn't go through. Stripe is retrying automatically — most cases are a quick card update from the billing portal.",
        graceHeadline: 'Pro features end in {days} days unless we can charge your card',
        graceBody: 'Your custom domain stays yours. Update your payment method to keep your Pro workspace.',
        ctaUpdatePayment: 'Update payment',
      },
      freeRedirect: "You're on the free plan. Visit the upgrade page to start a Pro subscription.",
    },
  },
  es: {
    workspace: {
      title: 'Espacio de Trabajo',
      subtitle: {
        mailbox: 'Buzón',
        calendar: 'Calendario',
        site: 'Sitio',
        settings: 'Configuración',
      },
    },
    theming: {
      title: 'Editar Tema',
      tabLayout: 'Diseño',
      tabColors: 'Colores',
      tabTypography: 'Tipografía',
      tabPhotos: 'Fotos',
      tabBrand: 'Marca',
      tabContent: 'Contenido',
      savePending: 'Guardando...',
      saved: 'Todos los cambios guardados',
      saveError: 'Error al guardar — reintentar',
      layout: {
        classic: {
          name: 'Clásico',
          desc: 'Consulta médica tradicional — foto de héroe superior, cuadrícula de servicios, credenciales prominentes, tarjeta de ubicación con mapa',
        },
        editorial: {
          name: 'Editorial',
          desc: 'Personalidad destacada — gran bio narrativa, lista de servicios compacta, galería de fotos como "momentos"',
        },
        minimal: {
          name: 'Minimalista',
          desc: 'Portafolio contenido — mucho espacio en blanco, flujo de una columna, acento usado con moderación',
        },
      },
      colors: {
        title: 'Color de Acento',
        helper: 'Todos los colores cumplen el contraste WCAG-AA',
      },
      fonts: {
        title: 'Peso de Fuente',
        light: 'Delgada',
        regular: 'Normal',
        bold: 'Negrita',
      },
      favicon: {
        title: 'Favicon',
        helper: 'Aparece en las pestañas del navegador. PNG, SVG, ICO o WebP. Mín 64×64 px, máx 5 MB.',
        upload: 'Subir favicon',
        remove: 'Eliminar',
        error: {
          size: 'El archivo debe pesar menos de 5 MB.',
          mime: 'Formatos aceptados: PNG, SVG, ICO, WebP.',
          dim: 'El favicon debe ser de al menos 64×64 píxeles.',
        },
      },
      photos: {
        title: 'Fotos del Consultorio',
        helper: 'Hasta 6 fotos de tu espacio de trabajo. Mín 1200×800 px, máx 5 MB por foto. PNG, JPEG o WebP.',
        add: 'Añadir foto',
        remove: 'Eliminar',
        error: {
          size: 'La foto debe pesar menos de 5 MB.',
          mime: 'Formatos aceptados: PNG, JPEG, WebP.',
          dim: 'La foto debe ser de al menos 1200×800 píxeles.',
        },
      },
      preview: {
        title: 'Vista previa en vivo',
        refresh: 'Actualizar vista previa',
        openInNewTab: 'Abrir en nueva pestaña',
      },
    },
    mailbox: {
      address: { label: 'Tu dirección de correo' },
      openButton: 'Abrir Buzón',
      changePassword: 'Cambiar Contraseña',
      quotaUsed: '{used} GB de 5 GB usados',
      cardTitle: 'Tu Buzón Práctikah',
      cardSubtitle: 'El webmail se abre en una pestaña nueva. Usa las credenciales IMAP en Configuración para apps nativas.',
      changePasswordCardTitle: 'Cambiar contraseña del buzón',
      changePasswordCardSubtitle: 'Tu contraseña del buzón es independiente de tu inicio de sesión en Medikah.',
      oldPasswordLabel: 'Contraseña actual',
      newPasswordLabel: 'Nueva contraseña',
      confirmPasswordLabel: 'Confirmar nueva contraseña',
      submit: 'Actualizar contraseña',
      saving: 'Guardando...',
      saved: 'Contraseña actualizada',
      error: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
    },
    calendar: {
      caldavUrl: { label: 'Suscribirse vía CalDAV' },
      copyUrl: 'Copiar URL',
      copied: 'Copiado',
      subscribeApple: 'Apple Calendar',
      subscribeGoogle: 'Google Calendar',
      subscribeOutlook: 'Outlook Móvil',
      cardTitle: 'Tu Calendario Práctikah',
      instructionsTitle: 'Suscríbete en tu dispositivo',
      appleSteps: 'En iPhone: Configuración → Calendario → Cuentas → Añadir cuenta → Otra → Añadir cuenta CalDAV. Servidor: practikah.medikah.health. Usuario: tu dirección de correo. Contraseña: la del buzón.',
      googleSteps: 'Abre Configuración de Google Calendar → Añadir calendario → Desde URL → pega la URL de CalDAV. (Solo lectura en Google Calendar; sincronización completa en Apple Calendar u Outlook.)',
      outlookSteps: 'En Outlook Móvil: Configuración → Añadir cuenta de correo → Avanzado → IMAP. Las mismas credenciales muestran tu calendario por CalDAV en clientes compatibles.',
      previewTitle: 'Tu calendario (vista previa de solo lectura)',
      previewFallback: 'La vista previa del calendario llega en la Fase 14. Por ahora, suscríbete vía CalDAV con la URL de arriba.',
    },
    site: {
      previewLabel: 'Vista Previa',
      editTheme: 'Editar Tema',
      openInNewTab: 'Abrir en Nueva Pestaña',
      copyShareLink: 'Copiar Enlace',
      toggleEnabled: 'Sitio publicado',
      toggleDisabled: 'Sitio desconectado',
      cardTitle: 'Tu Sitio de Perfil Práctikah',
      cardSubtitle: 'Tu página profesional en <slug>.medikah.health — incluida con tu espacio de trabajo.',
      notClaimedTitle: 'Tu sitio de perfil está listo',
      notClaimedBody: 'Tu espacio de trabajo Práctikah incluye un sitio de perfil profesional. Actívalo, personaliza la apariencia y compártelo con tus pacientes y colegas.',
      claimButton: 'Activar Mi Sitio de Perfil',
      claimDescription: 'Incluido con tu espacio de trabajo. Disponible de inmediato.',
      claimSuccess: 'Tu sitio de perfil está activo.',
    },
    settings: {
      imapHost: 'Servidor IMAP',
      imapPort: 'Puerto IMAP',
      smtpHost: 'Servidor SMTP',
      smtpPort: 'Puerto SMTP',
      username: 'Usuario',
      password: { reveal: 'Mostrar una vez', hide: 'Ocultar' },
      mobileconfig: {
        button: 'Auto-configurar iPhone',
        subtitle: 'Descarga un perfil iOS que configura Mail y Calendario con tus credenciales en un toque.',
      },
      tfa: {
        title: 'Autenticación de dos factores',
        enabled: 'Habilitada',
        notEnabled: 'No habilitada',
        deferralCopy: 'Configura 2FA la próxima vez que abras tu buzón.',
      },
      imapCardTitle: 'Credenciales IMAP',
      imapCardSubtitle: 'Conecta Apple Mail, Outlook o Gmail con estas credenciales.',
      revealConfirmTitle: '¿Mostrar contraseña del buzón?',
      revealConfirmBody: 'Te mostraremos tu contraseña una vez. Guárdala en tu gestor de contraseñas — no la almacenamos en un lugar que puedas volver a ver.',
      revealConfirmYes: 'Mostrar una vez',
      revealConfirmNo: 'Cancelar',
      passwordForm: {
        currentLabel: 'Contraseña actual',
        newLabel: 'Nueva contraseña (mín. 12 caracteres)',
        confirmLabel: 'Confirmar nueva contraseña',
        submit: 'Actualizar contraseña',
        submitting: 'Actualizando...',
        success: 'Contraseña actualizada correctamente.',
        error: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
        errorWeak: 'La contraseña debe tener al menos 12 caracteres.',
        errorNeedsMix: 'Usa al menos 3 de: minúscula, mayúscula, número, símbolo.',
        errorMismatch: 'Las contraseñas no coinciden.',
        strengthMeter: 'Seguridad',
        strengthWeak: 'Débil',
        strengthFair: 'Aceptable',
        strengthGood: 'Buena',
        strengthStrong: 'Fuerte',
      },
      imap: {
        title: 'Datos de conexión IMAP / SMTP',
        host: 'Servidor',
        imapPort: 'Puerto IMAP (SSL/TLS)',
        smtpPort: 'Puerto SMTP (SSL/TLS)',
        smtpStarttls: 'Puerto SMTP (STARTTLS)',
        username: 'Usuario',
        protocol: 'Seguridad',
        copy: 'Copiar',
        copied: '¡Copiado!',
        helpText: 'Usa estos datos en Apple Mail, Outlook o Gmail. Usa la contraseña que configuraste arriba.',
      },
      mobileconfigCard: {
        title: 'Auto-configurar iPhone / iPad',
        description: 'Descarga un perfil iOS que configura Mail y Calendario automáticamente.',
        button: 'Descargar perfil iOS',
        error: 'No se pudo descargar el perfil. Inténtalo de nuevo.',
      },
      tfaCard: {
        title: 'Autenticación de dos factores',
        notEnrolled: 'Aún no inscrita',
        promptOnLogin: 'Te pediremos que configures 2FA la próxima vez que abras tu buzón.',
        openMailboxPrompt: 'Abrir buzón para configurar 2FA',
      },
    },
    upgrade: {
      banner: {
        headline: 'Hazlo real en tu propio dominio',
        body: 'Lleva tu sitio de perfil a tu propio dominio — tu dirección personalizada, control total.',
        cta: 'Ver precios',
        dismiss: 'Quizás después',
      },
      page: {
        headline: 'Práctikah Pro — próximamente',
        body: 'Estamos ultimando Práctikah Pro. La configuración de dominio personalizado y la migración con un clic de tu sitio de perfil se lanzan pronto. ¿Quieres que te avisemos cuando esté disponible?',
        notify: 'Avísame',
        done: '¡Listo! Te avisaremos.',
      },
      wizard: {
        headline: 'Pasa a Práctikah Pro',
        stepLabels: {
          satCheck: 'Elegibilidad',
          plan: 'Elige plan',
          domain: 'Elige dominio',
          review: 'Revisar',
          checkout: 'Pago',
          provisioning: 'Configurando',
        },
        stepProgress: 'Paso {current} de {total}',
        plan: {
          sectionTitle: 'Elige tu plan Práctikah Pro',
          sectionSubtitle: 'Dominio propio, buzón Práctikah y tu sitio de perfil en tu propia dirección. Garantía de devolución de 30 días.',
          standardTitle: 'Estándar',
          premiumTitle: 'Premium',
          cadenceAnnual: 'Anual',
          cadenceMonthly: 'Mensual',
          cadenceLabel: 'Frecuencia de pago',
          annualSavings: 'Ahorra vs mensual',
          valueBullets: [
            'Dominio propio (es tuyo — transferible vía EPP)',
            'Buzón Práctikah en tu dominio',
            'Tu sitio de perfil en tu propio dominio',
            'Migración con un clic de tu sitio de perfil actual',
            'Soporte prioritario durante el lanzamiento',
          ],
          guarantee: 'Garantía de devolución de 30 días — sin preguntas.',
          continueCta: 'Continuar',
        },
        review: {
          sectionTitle: 'Revisa tu selección',
          sectionSubtitle: 'Confirma que todo se vea bien antes de continuar al pago seguro.',
          domainLabel: 'Dominio',
          planLabel: 'Plan',
          cadenceLabel: 'Frecuencia',
          totalLabel: 'Cargo hoy',
          backCta: 'Volver',
          confirmCta: 'Continuar al pago seguro',
        },
        checkout: {
          handoffHeadline: 'Pago seguro con Stripe',
          handoffText: 'Stripe procesa tu pago de forma segura. Nunca vemos los datos de tu tarjeta. Al confirmar, tu dominio y buzón se configuran automáticamente — usualmente en menos de 3 minutos.',
          cta: 'Continuar al pago seguro',
          loading: 'Abriendo Stripe…',
          cancelledNotice: 'Pago cancelado — puedes retomarlo en cualquier momento.',
        },
        provisioning: {
          placeholder: 'Configurando tu espacio Pro…',
          headline: 'Configurando tu espacio Pro',
          subhead:
            'Esto suele tardar unos 3 minutos. Puedes dejar esta página abierta o cerrarla — te avisaremos por correo en cuanto esté lista.',
          steps: {
            'pro.charge_confirmed': 'Pago confirmado',
            'pro.register_domain': 'Registrando tu dominio',
            'pro.write_dns': 'Configurando registros DNS',
            'pro.provision_mailcow_domain': 'Configurando tu dominio de correo',
            'pro.provision_pro_mailbox': 'Creando tu buzón personalizado',
            'pro.attach_saas_hostname': 'Emitiendo certificado SSL',
            'pro.migrate_theme': 'Migrando tu sitio al nuevo dominio',
          },
          completedHeadline: 'Tu espacio Pro está activo',
          completedCta: 'Ver mi nuevo sitio',
          finishLaterHeadline:
            'Tu dominio está registrado — estamos terminando la configuración',
          finishLaterBody:
            'Tuvimos un pequeño contratiempo terminando la configuración, pero tu dominio es tuyo y lo estamos reintentando automáticamente. Te avisaremos por correo en cuanto esté listo (generalmente dentro de una hora).',
          failedPreporHeadline: 'No pudimos completar tu compra',
          failedPreporBody:
            'Tu tarjeta no fue cobrada. Por favor intenta de nuevo o contacta a soporte si el problema persiste.',
          resolving: 'Resolviendo tu actualización…',
          missingSession:
            'Falta la sesión de pago — por favor regresa a la página de actualización.',
        },
        errors: {
          generic: 'Hubo un problema al iniciar el pago. Inténtalo de nuevo.',
          network: 'Error de red — verifica tu conexión e inténtalo de nuevo.',
        },
      },
      search: {
        headline: 'Elige tu dominio profesional',
        subheadline: 'Elige la dirección que verán tus pacientes. Lo dejamos listo en menos de 3 minutos.',
        seedClinicLabel: 'Nombre del consultorio (opcional)',
        seedClinicPlaceholder: 'ej. Consultorio Cardiológico López',
        freeformLabel: 'O escribe el tuyo',
        freeformPlaceholder: 'ej. drlopez',
        primaryHeading: 'Sugeridos para ti',
        defensiveHeading: 'Protege tu marca — también reserva',
        defensiveSubheading: 'Variantes comunes que un competidor o squatter podría registrar. Agrega cualquiera a tu plan con un clic.',
        pricingWholesale: 'Dominio (mayorista)',
        pricingService: 'Servicio Práctikah Pro',
        pricingTotal: 'Total por año',
        pricingNote: 'El precio mayorista viene directo del registrador. La tarifa de servicio cubre correo, sitio web y configuración.',
        available: 'Disponible',
        taken: 'No disponible',
        checking: 'Verificando…',
        selectCta: 'Seleccionar',
        reserveCta: 'Reservar',
        showMore: 'Ver más opciones',
        showLess: 'Ver menos',
        empty: 'Escribe el nombre de tu consultorio arriba o elige una de las sugerencias.',
        rules: {
          dr_lastname: 'Dr + tu apellido',
          dra_lastname: 'Dra + tu apellido',
          lastname_md: 'Apellido + MD',
          consultorio_lastname: 'Consultorio + apellido',
          first_last: 'Nombre + apellido',
          paternal_maternal: 'Apellido paterno + materno',
          clinic_name: 'Nombre de tu consultorio',
          freeform: 'Lo que escribiste',
          defensive_com_mirror: 'Versión .com de tu opción principal',
          defensive_consultorio: 'Variante con consultorio',
          defensive_concat: 'Nombre + apellido juntos',
        },
      },
    },
    sat: {
      blocked: {
        headline_en: 'Práctikah Pro is launching in México soon',
        headline_es: 'Práctikah Pro estará disponible en México pronto',
        body_en:
          "We're completing tax compliance with the SAT (Servicio de Administración Tributaria) so we can collect IVA correctly on Mexican subscriptions. We'll email you the moment Pro is available — your free workspace stays fully active in the meantime.",
        body_es:
          'Estamos finalizando el cumplimiento fiscal con el SAT (Servicio de Administración Tributaria) para cobrar correctamente el IVA en suscripciones mexicanas. Te avisaremos por correo en cuanto Pro esté disponible — mientras tanto, tu espacio gratuito sigue completamente activo.',
        cta_notify_en: 'Notify me when Pro launches in México',
        cta_notify_es: 'Avísame cuando Pro esté disponible en México',
      },
      unsupported: {
        headline_en: "Práctikah Pro isn't available in your country yet",
        headline_es: 'Práctikah Pro aún no está disponible en tu país',
        body_en:
          "We're currently launching in México and the United States. Your free workspace works the same anywhere — we'll expand to more countries soon.",
        body_es:
          'Estamos lanzando inicialmente en México y Estados Unidos. Tu espacio gratuito funciona igual en cualquier país — pronto expandiremos a más regiones.',
      },
    },
    tryProContact: {
      title: 'Contacto',
      subtitle: '¿Tienes una pregunta general? Envía un mensaje.',
      name: 'Tu nombre',
      email: 'Tu correo electrónico',
      subject: 'Asunto',
      message: 'Mensaje',
      disclaimer:
        'Por favor no incluya información médica o de salud personal. Para preguntas clínicas, use el canal de consultas de pacientes de Medikah.',
      submit: 'Enviar mensaje',
      submitting: 'Enviando...',
      success: 'Mensaje enviado. El médico se pondrá en contacto.',
      error: 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
      required: {
        name: 'El nombre es obligatorio.',
        email: 'El correo es obligatorio.',
        emailInvalid: 'Por favor ingresa un correo electrónico válido.',
        subject: 'El asunto es obligatorio.',
        message: 'El mensaje es obligatorio.',
      },
      maxLength: {
        subject: 120,
        message: 800,
      },
    },
    /** Phase 23 (PRES-03 / VOICE-08): Cue surface strings — ES */
    cue: {
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      surfacePlaceholder: 'Pregúntale a Cue sobre tu calendario…',
      surfaceClose: 'Cerrar',
      surfaceLoading: 'Cue está pensando…',
      surfaceError: 'Algo salió mal. Inténtalo de nuevo.',
      disconnectTitle: 'Desconectar Cue',
      disconnectSubtitle:
        'Revoca el acceso de Cue a tu calendario y bandeja. Esto elimina solo la contraseña de aplicación de Cue — tu acceso al buzón no se toca. Puedes reconectar cuando quieras.',
      disconnectButton: 'Desconectar Cue',
      disconnectDone: 'Cue desconectado.',
      disconnectError: 'No se pudo desconectar Cue. Inténtalo de nuevo.',
      confirmBlockTitle: '¿Bloquear este horario?',
      confirmClearTitle: '¿Liberar los bloques de Cue?',
    },
    wizard: {
      progress: 'Paso {n} de 3',
      title: {
        label: 'Elige tu honorífico',
        dr: 'Dr',
        drDisambig: 'Doctor (honorífico masculino)',
        dra: 'Dra',
        draDisambig: 'Doctora (honorífico femenino)',
        cardTitle: 'Configuremos tu espacio Práctikah',
        cardSubtitle: '¿Cómo te dirigimos en tu buzón y tu sitio?',
        continue: 'Continuar',
      },
      localPart: {
        title: 'Elige tu dirección de correo',
        subtitle: 'Esta es la dirección que verán tus pacientes. Puedes cambiarla después contactando a soporte.',
        previewLabel: 'Tu correo será',
        customLabel: 'O escribe la tuya',
        customPlaceholder: 'ej. dr-lopez',
        availabilityChecking: 'Verificando disponibilidad...',
        availableLabel: 'disponible',
        takenLabel: 'no disponible',
        invalidLabel: 'inválido',
        continue: 'Continuar',
        pickFirst: 'Por favor elige una dirección disponible para continuar.',
      },
      password: {
        title: 'Crea tu contraseña del buzón',
        subtitle: 'Tu contraseña del buzón es independiente de tu inicio de sesión en Medikah.',
        whyExplain: 'Tu buzón vive en su propio servidor por seguridad y portabilidad — Práctikah no guarda esta contraseña.',
        label: 'Nueva contraseña del buzón',
        confirmLabel: 'Confirmar contraseña',
        strengthMeter: 'Fuerza de la contraseña',
        strengthWeak: 'Débil',
        strengthFair: 'Aceptable',
        strengthGood: 'Buena',
        strengthStrong: 'Fuerte',
        mismatch: 'Las contraseñas no coinciden.',
        tooShort: 'La contraseña debe tener al menos 12 caracteres.',
        needsMix: 'Usa al menos 3 de: minúscula, mayúscula, número, símbolo.',
        submit: 'Crear mi buzón',
        submitting: 'Creando...',
        submitError: 'No se pudo crear tu buzón. Inténtalo de nuevo.',
      },
      completion: {
        headline: '¡Estás en Práctikah!',
        subhead: 'Bienvenido, Dr. {firstName}',
        passwordReveal: 'Tu contraseña del buzón (visible una sola vez)',
        copyPassword: 'Copiar contraseña',
        copied: 'Copiado',
        passwordWarning: 'Guárdala ahora — no la almacenamos.',
        openMailbox: 'Abrir Buzón',
        openMailboxDesc: 'Webmail en practikah.medikah.health',
        viewProfile: 'Ver tu perfil',
        viewProfileDesc: 'Tu página en Medikah',
        tryProPreview: 'Sitio de Perfil',
        tryProPreviewDesc: 'Tu presencia web en Práctikah',
        imapAccordionTitle: 'Credenciales IMAP (para Apple Mail / Outlook / Gmail)',
        goToSettings: 'Abrir Configuración',
      },
    },
    billing: {
      pageHeading: 'Facturación',
      pageSubtitle: 'Administra tu suscripción Pro, tu dominio personalizado y tus registros DNS.',
      statusActive: 'Activa',
      statusPastDue: 'Reintentando pago',
      statusGrace: 'Período de gracia',
      statusCanceled: 'Cancelada',
      statusUnknown: 'Desconocido',
      expirationLabel: 'Se renueva el {date}',
      autoRenewOn: 'Renovación automática activa',
      autoRenewOff: 'Renovación automática desactivada',
      domainLabel: 'Tu dominio',
      manageBillingCta: 'Administrar facturación',
      transferOutHeading: 'Transferir tu dominio',
      transferOutBody: 'Tu dominio es tuyo. Solicita el código EPP y te lo enviamos al instante a tu correo y aquí — pégalo en cualquier registrador para llevarte tu dominio.',
      transferOutCta: 'Transferir mi dominio',
      transferOutConfirm: 'Generaremos tu código de autorización EPP ahora. ¿Continuar?',
      transferOutSuccess: 'Aquí está tu código EPP — pégalo en el registrador receptor en menos de 30 días.',
      transferOutErrorGeneric: 'No pudimos generar el código EPP ahora. Reintenta en un momento.',
      eppLabel: 'Código EPP',
      eppCopyCta: 'Copiar código',
      eppCopiedLabel: 'Copiado',
      dnsRecordsHeading: 'Registros DNS (solo lectura)',
      dnsRecordsHelp: 'Estos registros mantienen activo tu dominio personalizado. La edición completa autoservicio está en planes; por ahora contáctanos para cambios.',
      dunning: {
        retryHeadline: 'Mantengamos tu espacio Pro activo',
        retryBody: 'Tu último pago no se procesó. Stripe está reintentando automáticamente — la mayoría se soluciona actualizando tu tarjeta desde el portal de facturación.',
        graceHeadline: 'Tu Pro termina en {days} días si no podemos cobrar tu tarjeta',
        graceBody: 'Tu dominio sigue siendo tuyo. Actualiza tu método de pago para conservar tu espacio Pro.',
        ctaUpdatePayment: 'Actualizar pago',
      },
      freeRedirect: 'Estás en el plan gratis. Visita la página de actualización para iniciar una suscripción Pro.',
    },
  },
};

/**
 * Resolve `{placeholder}` tokens in a translation string.
 * Tiny helper — no full i18n library; we only need positional substitution.
 */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}
