# Environment Variables (Lovable Runtime)

This project expects runtime environment variables to be provided by Lovable.
Do **not** commit real values to git.

Copy `.env.example` values into Lovable runtime environment settings.

## Required

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These must be set in Lovable runtime and are intentionally **not** committed to git.

## Optional

- `VITE_SUPABASE_PROJECT_ID` (if provided, the app can derive the Supabase URL as
  `https://<project-id>.supabase.co`).
