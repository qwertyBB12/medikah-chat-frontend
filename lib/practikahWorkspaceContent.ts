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
    mailbox: {
      address: { label: 'Your mailbox address' },
      openButton: 'Open Mailbox',
      changePassword: 'Change Password',
      quotaUsed: '{used} GB of 10 GB used',
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
      appleSteps: 'On iPhone: Settings → Calendar → Accounts → Add Account → Other → Add CalDAV Account. Server: mail.medikah.health. Username: your mailbox address. Password: your mailbox password.',
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
      cardTitle: 'Your Try Pro Preview',
      cardSubtitle: 'Your de-branded, themed site at <slug>.medikah.health.',
      notClaimedTitle: 'Claim your Try Pro preview',
      notClaimedBody: 'Spin up your free, de-branded preview site. You can theme it later.',
      claimButton: 'Claim Try Pro Preview',
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
        openMailboxDesc: 'Webmail at mail.medikah.health',
        viewProfile: 'View Your Profile',
        viewProfileDesc: 'Your Medikah profile page',
        tryProPreview: 'Try Pro Preview',
        tryProPreviewDesc: 'Spin up your themed site',
        imapAccordionTitle: 'IMAP credentials (for Apple Mail / Outlook / Gmail)',
        goToSettings: 'Open Settings',
      },
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
    mailbox: {
      address: { label: 'Tu dirección de correo' },
      openButton: 'Abrir Buzón',
      changePassword: 'Cambiar Contraseña',
      quotaUsed: '{used} GB de 10 GB usados',
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
      appleSteps: 'En iPhone: Configuración → Calendario → Cuentas → Añadir cuenta → Otra → Añadir cuenta CalDAV. Servidor: mail.medikah.health. Usuario: tu dirección de correo. Contraseña: la del buzón.',
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
      cardTitle: 'Tu Vista Previa Try Pro',
      cardSubtitle: 'Tu sitio sin marca y con tu tema en <slug>.medikah.health.',
      notClaimedTitle: 'Reclama tu vista previa Try Pro',
      notClaimedBody: 'Activa tu sitio gratuito sin marca. Puedes personalizarlo después.',
      claimButton: 'Reclamar Vista Previa Try Pro',
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
        openMailboxDesc: 'Webmail en mail.medikah.health',
        viewProfile: 'Ver tu perfil',
        viewProfileDesc: 'Tu página en Medikah',
        tryProPreview: 'Vista Previa Try Pro',
        tryProPreviewDesc: 'Activa tu sitio con tema',
        imapAccordionTitle: 'Credenciales IMAP (para Apple Mail / Outlook / Gmail)',
        goToSettings: 'Abrir Configuración',
      },
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
