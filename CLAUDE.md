## Governance Integration

@extends /.governance/guides/06-medikah.md

**Always read first:**
1. `/.governance/CLAUDE.md` (global instructions)
2. `/.governance/quick-ref/forbidden.md` (absolute rules)
3. `/MedikahHub/CLAUDE.md` (parent project)
4. This file (frontend-specific)

---

## Approved Design Overrides

@override accent-color
Uses Institutional Navy `#1B2A41` (`inst-blue`) as dominant brand color. Clinical Teal `#2C7A8C` is the accent/CTA color. See parent CLAUDE.md for rationale.

@override typography
Uses Oswald (`font-heading`) for ALL CAPS display headlines, DM Sans (`font-dm-sans`) for UI labels/buttons, DM Serif (`font-dm-serif`) for accent display, and Mulish (`font-body`) for body text + wordmark. Predates governance layer. Medikah wordmark uses Mulish lowercase per governance.

@override border-radius
Uses custom radii in `tailwind.config.js`: `rounded-sm` (8px), `rounded-md` (16px), `rounded-lg` (24px), `rounded-xl` (32px). Governance specifies 4px for Medikah.

---

# CLAUDE.md - Medikah Project Brief

> This file provides context for Claude Code sessions and agent teammates working on this repository.

## Project Overview

**Medikah** is a Pan-American health coordination platform connecting patients with physicians across borders. The platform handles patient intake, physician onboarding, credential verification, appointment scheduling, and cross-border healthcare coordination.

**Repository:** `medikah-chat-frontend`
**Type:** Next.js web application
**Status:** Active development

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5 (React 19) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase (PostgreSQL + Auth) |
| Authentication | NextAuth.js + Supabase Auth |
| CMS | Sanity (Project: `fo6n8ceo`) |
| Email | Resend |
| Deployment | Netlify |
| Analytics | Google Analytics 4 |
| Error Tracking | Sentry |

---

## What's Built and Working

### Patient Portal (`/patients`)
- Conversational intake chat with AI triage
- Cross-border care consent flow with 14 legal sections
- Appointment scheduling with timezone support
- Email confirmation with ICS calendar attachment
- Bilingual support (English/Spanish)

### Physician Portal (`/physicians`)
- **Onboarding** (`/physicians/onboard`) - Batched form card agent (~12 exchanges):
  - LinkedIn OAuth integration for profile import
  - BatchedLicensingForm: multi-country licensing in one card
  - BatchedSpecialtyForm: primary + sub-specialties + board certs
  - BatchedEducationForm: school + residency + fellowships
  - BatchedPresenceForm: availability + timezone + languages + institutions
  - Publication search (PubMed, ResearchGate, Academia.edu)
  - Network agreement consent

- **Dashboard** (`/physicians/dashboard`) - Full physician management:
  - ProfileOverview: photo, stats, completeness bar
  - AIDiagnosisTool: GPT-4o differential diagnosis (via backend `/ai/diagnosis`)
  - InquiryList: patient queue with accept/decline, filter tabs, pagination
  - AvailabilityEditor: weekly schedule grid with timezone
  - Verification status card
  - Network stats card

- **Public Profiles** (`/dr/[slug]`) - SSR physician profile pages:
  - 7 sections: Hero, About, SpecialtiesGrid, CredentialsBadges, Publications, Availability, CTA
  - Scroll animations via FadeInSection (IntersectionObserver)
  - JSON-LD structured data + dynamic SEO meta tags
  - Only renders verified physicians (404 for unverified)
  - Slug computed from `full_name`

- **Account Setup** (`/physicians/setup`) - Magic link password creation

- **Welcome Email** - Sent via Resend with magic link for account access

### Verification System (3-Tier)
- **Tier 1 Auto-Verify:** COFEPRIS (Mexico), US State Medical Boards
- **Tier 2 Semi-Auto:** LinkedIn profile matching, Google Scholar verification
- **Tier 3 Manual:** Queue for human review

### Landing Page (`/`)
- Hero with Oswald ALL CAPS headlines, alternating light/dark sections with curve dividers
- Key sections: HowItWorks, HorizontalStats, Monument, StaggeredGrid, ChatShowcase, DarkFeatures, Collaborators, CTAMonument, RegulatoryDisclosure, Waitlist, LandingFooter
- Multi-audience targeting (patients, physicians, insurers, employers)
- Governance and regulatory disclosure

### Legal Pages
- Privacy Policy (`/privacy`) - 38KB comprehensive document
- Terms of Service (`/terms`) - 34KB comprehensive document

---

## What's In Progress

| Feature | Status | Notes |
|---------|--------|-------|
| Insurer Portal | Placeholder | `/insurers` exists but not built |
| Employer Portal | Placeholder | `/employers` exists but not built |
| Physician Verification Emails | Needs testing | Status update notifications |
| Doxy.me Integration | Configured | Uses shared room URL |

---

## File Structure Conventions

```
medikah-chat-frontend/
├── pages/                    # Next.js routes
│   ├── api/                  # API endpoints
│   │   ├── auth/             # NextAuth + LinkedIn OAuth
│   │   ├── consent/          # Save/check consent records
│   │   ├── physicians/       # Physician CRUD + verification
│   │   └── publications/     # Academic publication search
│   ├── dr/                   # Public physician profiles (/dr/[slug])
│   ├── patients/             # Patient portal
│   ├── physicians/           # Physician portal
│   ├── employers/            # Employer portal (placeholder)
│   └── insurers/             # Insurer portal (placeholder)
│
├── components/               # React components
│   ├── landing/              # Landing page sections (29 components)
│   ├── physician/            # Physician-specific components
│   │   ├── onboarding/       # Batched form components (Licensing, Specialty, Education, Presence)
│   │   └── profile/          # Public profile sections (Hero, About, Grid, Badges, CTA, etc.)
│   └── [shared components]   # PortalLayout, ChatInput, Sidebar, etc.
│
├── lib/                      # Utilities and services
│   ├── verification/         # 3-tier verification system
│   ├── portalAuth.ts         # Role detection and routing
│   ├── physicianClient.ts    # Physician CRUD operations
│   ├── physicianEmail.ts     # Welcome email templates
│   ├── linkedin.ts           # OAuth integration
│   ├── publications.ts       # PubMed/ResearchGate/Academia
│   ├── consent.ts            # Consent management
│   ├── supabase.ts           # Client-side Supabase
│   ├── supabaseServer.ts     # Server-side admin client
│   └── theme.ts              # Design tokens
│
├── types/                    # TypeScript definitions
│   └── next-auth.d.ts        # Session type extensions
│
├── styles/                   # Global CSS
│   └── globals.css           # Tailwind imports + custom styles
│
├── supabase/                 # Database
│   └── migrations/           # SQL migration files
│
└── public/                   # Static assets
```

### Naming Conventions

- **Pages:** kebab-case (`physician-dashboard.tsx`) or `[param].tsx` for dynamic
- **Components:** PascalCase (`PhysicianOnboardingAgent.tsx`)
- **Utilities:** camelCase (`portalAuth.ts`)
- **API Routes:** kebab-case paths, camelCase handlers
- **Database:** snake_case columns (`full_name`, `verification_status`)

---

## Sanity Schema Patterns

Sanity CMS is minimally integrated. Configuration in `lib/sanity.ts`:

```typescript
projectId: 'fo6n8ceo'
dataset: 'production'
apiVersion: '2024-01-01'
useCdn: true
```

Schemas are managed in a separate Sanity Studio (not in this repo).

---

## Design System

### Typography

| Font | Tailwind Class | Role |
|------|---------------|------|
| Mulish | `font-body` | Body text, wordmark |
| Oswald | `font-heading` | Display headlines, ALL CAPS sections |
| DM Sans | `font-dm-sans` | UI labels, buttons, auth forms |
| DM Serif | `font-dm-serif` | Accent display |

Mulish weights: 300, 400, 600, 700, 800, 900.

### Color Palette

| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Institutional Navy | `inst-blue` | `#1B2A41` | Primary brand, headers, buttons |
| Clinical Teal | `clinical-teal` | `#2C7A8C` | Accents, links, CTAs |
| Linen Warmth | `linen` | `#F0EAE0` | Warm backgrounds |
| Deep Charcoal | `deep-charcoal` | `#1C1C1E` | Headlines, emphasis |
| Body Slate | `body-slate` | `#4A5568` | Body text |
| Archival Grey | `archival-grey` | `#8A8D91` | Secondary text, labels |
| Pure White | `white` | `#FFFFFF` | Backgrounds, cards |
| Clinical Surface | `clinical-surface` | `#F5F6F8` | Page backgrounds |

### Semantic Colors

| Purpose | Variable | Hex |
|---------|----------|-----|
| Success | `confirm-green` | `#2D7D5F` |
| Warning | `caution-amber` | `#B8860B` |
| Error | `alert-garnet` | `#B83D3D` |
| Info | `info-blue` | `#3B82B6` |

### Usage in Code

```tsx
// Tailwind classes
<div className="bg-inst-blue text-white">
<p className="text-body-slate">
<button className="bg-clinical-teal hover:bg-clinical-teal/90">

// Theme object (lib/theme.ts)
import { colors } from '@/lib/theme';
style={{ color: colors.institutionalBlue }}
```

---

## API Patterns

### Endpoint Conventions

```
POST /api/physicians/create     → Create resource
GET  /api/physicians/[id]       → Read resource
POST /api/physicians/[id]/verify-credentials → Action on resource
GET  /api/consent/check?userId=xxx → Query with params
```

### Response Format

```typescript
// Success
{ success: true, physicianId: "uuid", emailSent: true }

// Error
{ error: "Error message" }

// List
{ data: [...], count: number }
```

### Authentication in API Routes

```typescript
// Server-side Supabase (bypasses RLS)
import { supabaseAdmin } from '@/lib/supabaseServer';

// Always check for null
if (!supabaseAdmin) {
  return res.status(500).json({ error: 'Database not configured' });
}
```

### Error Handling Pattern

```typescript
try {
  const { data, error } = await supabaseAdmin.from('table').insert(row);

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Already exists' });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ success: true, id: data.id });
} catch (err) {
  console.error('Exception:', err);
  return res.status(500).json({ error: 'Internal error' });
}
```

---

## Environment Variables

### Required for Production

```bash
# Auth
NEXTAUTH_URL=https://medikah.health
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>

# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only!

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=welcome@medikah.health
NEXT_PUBLIC_BASE_URL=https://medikah.health

# Social OAuth (Google + LinkedIn)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=https://medikah.health/api/auth/linkedin/callback
```

### Optional

```bash
# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Backend API (for chat)
NEXT_PUBLIC_API_URL=https://api.medikah.health

# Development
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=xxx
```

---

## Database Schema (Key Tables)

### `physicians`
Primary table for physician profiles. 70+ columns including:
- Identity: `id`, `full_name`, `email`, `photo_url`, `linkedin_url`
- Licensing: `licenses` (JSONB array with country, type, number)
- Specialty: `primary_specialty`, `sub_specialties`, `board_certifications`
- Status: `verification_status` ('pending'|'in_review'|'verified'|'rejected')
- Link to auth: `auth_user_id` (references auth.users)

### `consent_records`
Patient consent for cross-border care:
- `user_id`, `form_type`, `form_version`, `checkboxes`, `recording_consent`

### `physician_consent_records`
Physician network agreement:
- `physician_id`, `form_type`, `sections`, `signed_at`

### `physician_onboarding_audit`
Immutable log of onboarding actions:
- `action` ('started'|'phase_completed'|'completed'|'abandoned')

---

## Known Issues & Technical Debt

| Issue | File | Priority |
|-------|------|----------|
| Role detection incomplete for insurers/employers | `lib/portalAuth.ts:28-29` | Medium |
| LinkedIn full profile needs Marketing API | `lib/linkedin.ts:31-32` | Low |
| Unused `toSnakeCase` function | `lib/physicianClient.ts:103` | Low |
| Multiple unused variables flagged by ESLint | Various | Low |
| Design preview pages should be removed for prod | `pages/design-preview*.tsx` | Low |

---

## Common Commands

```bash
# Development
npm run dev           # Start dev server on :3000

# Build
npm run build         # Production build
npm run start         # Start production server

# Lint
npm run lint          # ESLint check

# Database
# Migrations are in /supabase/migrations/
# Run via Supabase dashboard or CLI
```

---

## Authentication Flow

### Auth Gateway (`/chat`)

`/chat` is the unified auth gateway with role selection and social login:

**Providers:** Google, LinkedIn (OIDC), Credentials (email/password)

1. User selects role: "I'm a Patient" or "I'm a Physician"
2. Patient options: Google or email/password
3. Physician options: LinkedIn (preferred), Google, or email/password
4. Social login users synced to Supabase Auth via `ensureSupabaseUser()` in `lib/portalAuth.ts`
5. `detectUserRole(email)` queries `physicians` table for role
6. JWT includes `userId`, `role`, `provider`, and `linkedInProfile` (if LinkedIn auth)
7. Pages use `useSession()` to route by role

**Route:** `/doctor/onboard` → redirects to `/physicians/onboard`

### Physician Magic Link Flow (returning users)

1. Onboarding creates Supabase Auth user + physician record
2. Magic link sent via Resend email
3. Link goes to `/physicians/setup`
4. User sets password, auto-logs in via NextAuth
5. Redirects to `/physicians/dashboard`

---

## i18n Support

- Locales: `en` (default), `es`
- All patient-facing content is bilingual
- Consent forms have full Spanish translations
- Set via `router.locale` or URL prefix (`/es/...`)

---

## Security Notes

- RLS enabled on all Supabase tables
- Service role key is server-side only
- Social auth gate prevents anonymous access to AI-powered features
- CSRF protection on LinkedIn OAuth (10-min state expiry)
- Rate limiting per authenticated user (not just IP)
- IP anonymization in GA4 for HIPAA considerations
- CSP headers configured for Supabase, GA, Sentry

---

## Contact

For questions about this codebase, check the GitHub issues or contact the Medikah development team.
