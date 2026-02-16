## Governance Integration

@extends /.governance/guides/06-medikah.md

**Always read first:**
1. `/.governance/CLAUDE.md`
2. `/.governance/quick-ref/forbidden.md`
3. This file

# Medikah Chat Frontend

This is the Next.js frontend for the Medikah MVP Chat. It provides a basic chat interface
secured behind user authentication using **NextAuth.js** and styled with **Tailwind CSS**. The app
communicates with a FastAPI backend to send user messages and display responses.

## Getting Started

1. Install dependencies (run locally on your machine):

   ```bash
   npm install
   ```

2. Copy the example environment file and update the values:

   ```bash
   cp .env.example .env.local
   # Edit .env.local to set NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, and demo credentials
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to see the app. You’ll need to sign in using
   the demo email and password defined in your `.env.local` file.

## Customization

- **Tailwind theme**: Custom primary and secondary colors are defined in
  `tailwind.config.js`. Adjust these values to match your brand.
- **Authentication**: The credentials provider in `pages/api/auth/[...nextauth].ts` uses
  environment variables for demonstration. For production, integrate with a real user
  database or OAuth providers.
- **API URL**: The frontend expects a `NEXT_PUBLIC_API_URL` pointing at your FastAPI
  backend. See the backend project for details.