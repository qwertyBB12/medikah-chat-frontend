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
      claimDescription: "Get your doctor site live at your own subdomain. It's free and takes one click.",
      claimSuccess: 'Your Try Pro preview is live!',
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
      claimDescription: 'Activa tu sitio de médico en tu propio subdominio. Es gratis y con un solo clic.',
      claimSuccess: '¡Tu vista previa Try Pro está activa!',
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
