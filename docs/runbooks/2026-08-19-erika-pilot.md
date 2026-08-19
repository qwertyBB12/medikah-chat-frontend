# Runbook: Erika Pilot, First Real Practice Onboarding

**Date:** 2026-08-19
**Doctor:** Dra. Erika Torres Valdez, urogynecology, CDMX. Spanish speaking.
**Her stack today:** Apple Calendar (iPhone + Mac) and email.
**Outcome:** her practice appointments live on the Medikah SOGo calendar, she keeps
her exact Apple Calendar workflow, and Cue can see everything.

Run this top to bottom. Do not skip Section 0.

---

## 0. Before you touch the admin screen

These are preconditions, not steps. If any one of them is false, stop and fix it
first. A real doctor is on the other end of this.

1. **`cue-hygiene-1` is reviewed, merged, and deployed.** Until it is, the two
   stub tools answer a real doctor with errors. This is the single most important
   gate on the whole day.
2. **The four switches are set on Netlify:** `REJECTION_EMAIL_ENABLED`,
   `STALLED_NUDGE_ENABLED`, `VERIFICATION_CLERK_ENABLED` (with
   `CLERK_REVIEWER_EMAIL`), `ISABEL_AGENT_ENABLED`.
3. **`INTERNAL_API_SHARED_SECRET` is set on Render** before the memory purge sweep
   gets scheduled. Not needed for the pilot itself, but confirm it while you are
   in the env screens.
4. **You are signed in at medikah.health as an admin** whose `admin_users.role` is
   `admin` or `super_admin`. A `reviewer` gets a 403 on the verify action and you
   will lose ten minutes finding out why.
5. **Erika has her phone in her hand and an authenticator app already installed.**
   Duo Mobile is what the email recommends. Authy and Google Authenticator work.
   Do not start Section 3 until she is actually available. The activation token
   lives for 24 hours, so there is no rush, but a half-finished TOTP enrollment is
   the thing that goes wrong.

---

## 1. Create the physician record

Admin list page: `https://medikah.health/admin/physicians`.

If Erika already has a record from the CDMX event, find it with the search box
(placeholder "Search by name or email...") and skip to Section 2. Do not create a
second record. A duplicate physician row is painful to unwind and it will collide
on her cédula in `physician_licenses`.

If she has no record, create it through the normal onboarding path rather than by
hand, so the licenses and specialties land in the right child tables.

Before moving on, confirm on her detail page (`/admin/physicians/{id}`):

- `onboarding_language` is `es`. This decides the language of the activation
  email. Getting this wrong sends a Mexican doctor an English email on day one.
- Her name is spelled as she uses it professionally.
- Her cédula is recorded and her verification evidence is filed.

---

## 2. Verify and provision the mailbox

This is one click that fires three things: the status change, the Mailcow mailbox
creation, and the activation email. They are chained, so if provisioning fails,
no activation email is sent and no token is burned.

On `/admin/physicians/{id}`, in the **Admin Actions** card, click
**"Verify & provision mailbox"**.

In the modal:

1. **"How should patients address them?"** Choose **`Doctora (Dra.)`**. The system
   never guesses the honorific from the name. This is deliberate.
2. **"Workspace email address."** The field will prefill from her name, and here
   is the trap: the derivation takes the **last** token of the full name as the
   surname. "Erika Torres Valdez" derives `dra-valdez`, which uses her materno.
   **Override it to `dra-torres`.** The modal's own helper text says exactly this:
   *"Edit this for double surnames (e.g. `dra-garcia`)."* Confirm the spelling
   with her before you click, because changing a mailbox address afterward is a
   migration, not an edit.
3. Click **"Provision & activate"**. The button reads "Provisioning..." while it
   works.

**What you should see:**

> Verified. Mailbox provisioned (dra-torres@medikah.health). Activation link sent
> to the physician's email.

**If you see something else:**

| Message | What it means | What to do |
|---|---|---|
| "A valid activation link was already sent recently." | A live, unconsumed token exists. | Fine. Have her use the email she already has, or use "Resend activation link" to force a fresh one. |
| "Verified, but the mailbox is not provisioned yet, so no activation link was sent." | Mailcow call failed. | Check `MAILCOW_API_URL` (origin only, not the `/admin` path) and `MAILCOW_API_KEY`. Fix, then re-run. |
| "...is already taken" | `local_part_taken`. | Pick another address with her. Do not auto-suffix a real doctor into `dra-torres2`. |
| "A Doctor/Doctora title is required" | Title not set. | Pick the title in the modal. |
| Quota error (`mailbox_quota_left_exceeded`) | The Mailcow domain quota is exhausted. | Raise the domain quota in Mailcow. Each mailbox takes 5 GB. |

**There is no password to give her.** The provisioner generates a throwaway
password, never logs it, never stores it, and discards it.
`mailbox_password_set` stays `false`. She sets her real password herself in the
next section. If you find yourself looking for a password to read out, you have
misunderstood the flow.

**Resend later if needed:** the "Resend activation link" button, or
`POST /api/admin/physicians/{id}/resend-activation`. It returns 409 if the record
is not `verified`, and it cannot downgrade her.

---

## 3. Activation: password, then TOTP

She receives an email from **Práctikah · Medikah `<activacion@medikah.health>`**.
The Spanish subject line begins "Configure su espacio de trabajo". The button is
**"Activar espacio de trabajo"**. The link is
`https://medikah.health/auth/activate/{token}` and it is good for 24 hours.

### 3a. Password

Screen: **"Crea Tu Contraseña"**, placeholder "Al menos 12 caracteres,
combinados". Rules the page enforces:

- At least 12 characters.
- At least 3 of: lowercase, uppercase, number, symbol.

This becomes her **mailbox password**. She will need it again in Section 4 for the
calendar, and again any time she logs into webmail directly. Have her put it in a
password manager now, not later.

### 3b. TOTP, the known stumble

Screen: **"Configura la Autenticación de Dos Factores"**.

Read this out to her **before** she scans anything:

> **If you already have an old "Medikah" or "Práctikah" entry in your
> authenticator from a previous attempt, delete it first.** A leftover entry
> generates codes that will not work. This is the number one cause of "code not
> accepted."

Then:

1. She deletes any existing Medikah or Práctikah entries. All of them. Enroll
   exactly one fresh QR.
2. She scans the QR code shown on screen.
3. She reads the 6 digit code **from her own screen** and types it in herself.
   **Never relay a code by voice.** Codes rotate every 30 seconds and the voice
   round trip blows the window. This burned us before.
4. She presses **"Verificar Código"**.

Success screen: **"Espacio de Trabajo Activo"**, then a redirect to her dashboard.
At that moment `totp_enrolled` and `activation_complete` flip together, and she
can log in.

### If a code is rejected

Work through these in order. The first two cover almost every real case.

1. **Duplicate entry.** Confirm she is reading the newest entry and that the old
   ones are gone. Check the entry label, which is her email address.
2. **Phone clock drift.** Settings, then General, then Date & Time, and make sure
   "Set Automatically" is on. A founder lockout that looked like a server outage
   turned out to be exactly this, and an iPhone restart (which forces an NTP
   resync) fixed it.
3. **Lockout, not a bad code.** The verify route allows 3 failures per 5 minutes
   per IP. It now returns a distinct message, "Too many attempts. Please wait a
   few minutes and try again." If you see that, **stop retrying**. Waiting is the
   fix. Retrying makes correct codes look wrong.
4. **Code about to roll.** If the timer is nearly up, wait for the next one.

The code allows plus or minus 60 seconds of drift, swept manually because
otplib v13 silently ignores its own tolerance options.

### If the authenticator is truly lost, later

She goes to `/chat` and uses **"Configurar un nuevo autenticador"**, which is
`/auth/reenroll`. It asks for her Práctikah email and her mailbox password, then
shows a fresh QR. The page tells her the new entry is labelled with her email so
a stale duplicate is easy to spot. If she cannot get in at all, she files a lost
2FA request from `/chat` and an admin approves it at
`/api/admin/totp-reset-approve`, after which she returns to the re-enroll link.

---

## 4. Add the Medikah calendar to Apple Calendar

Her appointments have to land on the Medikah SOGo calendar. That is the only
calendar Cue can see. Apple Calendar speaks CalDAV natively, so she keeps her
workflow and the data moves house.

**Credentials for both devices:**

- **Server:** `practikah.medikah.health`
- **Username:** `dra-torres@medikah.health` (the full address, not the local part)
- **Password:** the mailbox password from Section 3a
- **Full CalDAV URL, if manual entry is needed:**
  `https://practikah.medikah.health/SOGo/dav/dra-torres/Calendar/personal/`

Use `practikah.medikah.health`. Do not use `mail.medikah.health`, which is a
legacy CNAME the codebase itself calls fragile.

### 4a. iPhone

Settings, then Calendar, then Accounts, then Add Account, then Other, then
**Add CalDAV Account**.

Fill in:

- Server: `practikah.medikah.health`
- User Name: `dra-torres@medikah.health`
- Password: her mailbox password
- Description: `Medikah`

Tap Next. Auto-discovery should resolve the account. If it fails, put the full
CalDAV URL above in the Server field instead of the bare hostname.

Then, still in Settings, Calendar, Default Calendar: **set the default to the
Medikah calendar**. This is the step that makes the pilot work without her
thinking about it. Every new appointment she creates on her phone lands where Cue
can see it, automatically.

### 4b. Mac

Open the Calendar app, then the **Calendar** menu, then **Add Account**, then
**Other CalDAV Account**, then Continue.

- Account Type: **Manual**
- User Name: `dra-torres@medikah.health`
- Password: her mailbox password
- Server Address: `practikah.medikah.health`

Click Sign In. (The same account can be added from System Settings, then Internet
Accounts, then Add Other Account, then CalDAV Account. Either path produces the
same result.)

Then Calendar, then Settings, then General, and set **Default Calendar** to the
Medikah calendar here too. The default is per device.

### 4c. Confirm it is live

Have her create a test event on the Mac and confirm it appears on the iPhone
within a minute. Then open
`https://practikah.medikah.health/SOGo/so/dra-torres@medikah.health/Calendar` in a
browser and confirm the same event is there. If it shows in all three places, the
calendar is wired.

---

## 5. Move her existing appointments

Her upcoming appointments are on her current calendar (iCloud or local). Cue
cannot see them there. Do this on the **Mac**, where it is far less painful.

For each upcoming appointment:

1. Double click the event, or select it and press Command+I.
2. Click the calendar name in the popup and choose the **Medikah** calendar.

**Before you start, tell her three things:**

- Apple Calendar implements a cross-calendar move as a delete plus a recreate.
  **If an event has invitees, they may receive a cancellation and a new
  invitation.** For appointments where the patient was invited by email, either
  accept that or leave the event where it is and recreate it manually.
- Only move what is **upcoming**. History does not need to move and moving it
  multiplies the invitee problem for no benefit.
- Recurring series move as a series. Check that the repeat rule survived on at
  least one of them.

There is no reliable bulk move in Apple Calendar. Budget real time for this and
do it with her rather than for her, so she sees where things went.

**Do not** move or delete any event carrying the `X-CUE-MANAGED` property. Those
are Cue's own, and Cue's `clear_range` only ever touches tagged events, which is
what keeps her own appointments safe from it. On day one there will not be any
yet.

---

## 6. Confirm Cue can see it

Sign in as Erika at `https://medikah.health/chat`, or have her do it, and ask Cue
in Spanish:

> ¿Qué tengo mañana?

Cue mints a Mailcow app password scoped to `imap_access` and `dav_access` only,
reads the day over CalDAV, and answers. If it says something like "connect your
workspace" instead, the gate in `_load_workspace_context()` did not pass, which
means either `verification_status` is not `verified` or `mailbox_local_part` is
not set. Go back to Section 2.

Sanity checks worth doing while you are there:

- **Timezone.** Default is `America/Mexico_City`, and the real source of truth is
  `physician_availability.timezone`. Ask about an evening appointment
  specifically. An evening CDMX event rolls into the next UTC day, and that has
  produced a wrong-day answer before. Also confirm the times read back in local
  time, not UTC.
- **Blocking time by voice.** Ask her to block an hour. Cue proposes and shows a
  confirm card; nothing is written until she taps Confirm. Have her actually tap
  it once so she learns the pattern, then check the event landed in Apple
  Calendar.

---

## 7. Day one expectations, script for the doctor

Deliver this in Spanish, in person or by voice. It is written in usted so it is
reusable for the September wave. With Erika, drop to tú.

The point of the script is to be precise about the line between what works today
and what is being built, because she is going to shape the September build by
using this.

> **Lo que Cue hace desde hoy**
>
> Cue ya ve su calendario y su correo. Puede preguntarle en español, hablando o
> escribiendo, cosas como "¿qué tengo mañana?" o "bloquéame el martes de cuatro a
> seis". Cuando le pide bloquear o liberar tiempo, Cue no escribe solo... le
> muestra una tarjeta de confirmación y usted decide. Nada entra en su calendario
> sin que usted lo apruebe.
>
> Cue también le da apoyo clínico cuando lo pide, y tiene memoria: va aprendiendo
> cómo trabaja usted. Esa memoria es suya, usted da el consentimiento, y la puede
> revisar o borrar cuando quiera.
>
> **Lo que necesito de usted**
>
> Una sola cosa, y es la que hace que todo lo demás funcione: sus citas tienen que
> vivir en el calendario de Medikah. Ya lo conectamos a su Apple Calendar, así que
> usted sigue trabajando igual que siempre, en la misma app, con la misma
> costumbre. Solo asegúrese de que las citas nuevas se guarden en el calendario de
> Medikah, que ya quedó como el predeterminado en su iPhone y en su Mac. Lo que
> Cue no ve, no existe para Cue.
>
> **Lo que llega en septiembre**
>
> Reagendar pacientes: que Cue proponga el cambio, avise al paciente y mueva la
> cita. Eso se está construyendo ahora mismo, y se está construyendo con lo que
> pase en su consultorio estas semanas. Su práctica es la que define cómo queda.
>
> **Lo que todavía no**
>
> Cue no manda correos por usted, y no lo va a hacer hasta que usted lo pida. Sus
> credenciales de correo están limitadas a leer, a propósito. Y por ahora la
> cuenta es suya sola... el acceso para su asistente está especificado y viene
> enseguida. Mientras tanto, yo hago ese papel desde la consola.
>
> **Si algo falla**
>
> Me escribe. No pelee con la máquina. Los primeros días de un piloto son para
> encontrar cosas, y cada cosa que encuentre es trabajo que le ahorro al siguiente
> médico.

---

## 8. Quick reference

| Thing | Value |
|---|---|
| Admin detail page | `https://medikah.health/admin/physicians/{id}` |
| Her mailbox | `dra-torres@medikah.health` |
| Activation link | `https://medikah.health/auth/activate/{token}`, 24 hours |
| Re-enroll authenticator | `https://medikah.health/auth/reenroll` |
| Webmail and calendar | `https://practikah.medikah.health/SOGo/` |
| CalDAV server (device setup) | `practikah.medikah.health` |
| CalDAV full URL | `https://practikah.medikah.health/SOGo/dav/dra-torres/Calendar/personal/` |
| Calendar in browser | `https://practikah.medikah.health/SOGo/so/dra-torres@medikah.health/Calendar` |
| Activation sender | `activacion@medikah.health` |
| Mailbox quota | 5 GB |
| TOTP tolerance | plus or minus 60 seconds |
| TOTP rate limit | 3 failures per 5 minutes per IP |

## 9. Known pitfalls, in one place

1. **Duplicate authenticator entries.** Delete every old Medikah and Práctikah
   entry before scanning. Number one cause of "code not accepted."
2. **Phone clock drift.** "Set Automatically" must be on. Restart the iPhone to
   force a resync.
3. **Retrying into a lockout.** 3 failures in 5 minutes locks the IP. Wait it out.
4. **Relaying codes by voice.** Never. The 30 second window will not survive it.
5. **The derived mailbox uses the materno.** Override `dra-valdez` to
   `dra-torres` in the provisioning modal.
6. **`onboarding_language` decides the email language.** Set it to `es` before
   verifying.
7. **Moving events between calendars can notify invitees.** Warn her first.
8. **Only the Medikah calendar is visible to Cue.** Set it as the default on both
   devices or appointments will quietly land somewhere Cue cannot see.
