# Lovable Cloud Migration Notes (Supabase Example)

Use these steps if you want to run the app against your own Supabase instance instead of
Lovable Cloud. These are adapted from Lovable’s migration guidance and kept short for the repo.

## 1) Create a Supabase project

1. Go to https://supabase.com → **New project**.
2. Choose your organization, set a strong DB password, select a region, and create the project.
3. Copy the **Project ID**, **Project URL**, and **anon/public key** from the settings page.

## 2) Update environment variables

Set or update these values:

```
VITE_SUPABASE_PROJECT_ID="your-new-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
VITE_SUPABASE_URL="https://your-new-project-id.supabase.co"
```

In Lovable: **Project Settings → Environment Variables**.  
Locally: copy `.env.example` to `.env` and fill the values.

## 3) Update Supabase config

Edit `supabase/config.toml`:

```
project_id = "your-new-project-id"
```

## 4) Run database migrations

Run the SQL files in `supabase/migrations/` in timestamp order.  
You can paste them into the Supabase SQL editor or use the CLI:

```
supabase login
supabase link --project-ref your-new-project-id
supabase db push
```

## 5) Move data and files

- Export tables from Lovable Cloud and import CSVs into Supabase.
- Download storage bucket files and re-upload them to Supabase.

## 6) Reconfigure auth and secrets

- Re-enable OAuth providers under Supabase **Authentication**.
- Update redirect URLs in each OAuth provider to the new Supabase URL.
- Add any external service secrets under **Edge Functions → Manage Secrets**.

## 7) Verify the app

- App loads without errors.
- Auth, data reads/writes, and storage uploads/downloads work as expected.

