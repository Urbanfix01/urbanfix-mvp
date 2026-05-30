# UrbanFix production launch checklist

Use this file before opening real users. Do not paste real secrets into Git.

## 1. Vercel production variables

Set these in Vercel, Environment: `Production`.

Required to unblock login, database access, public URLs, and notifications:

- `NEXT_PUBLIC_SUPABASE_URL`: live Supabase URL, for example `https://<project-ref>.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: live public anon key.
- `SUPABASE_URL`: same live Supabase URL.
- `SUPABASE_SERVICE_ROLE_KEY`: live service role key. Keep server-only.
- `NEXT_PUBLIC_PUBLIC_WEB_URL`: `https://www.urbanfix.com.ar`.
- `NOTIFY_WEBHOOK_SECRET`: random secret with at least 32 characters.

Set these URL aliases to the same production domain to avoid mixed redirects:

- `NEXT_PUBLIC_SITE_URL`: `https://www.urbanfix.com.ar`.
- `NEXT_PUBLIC_APP_URL`: `https://www.urbanfix.com.ar`.
- `PUBLIC_WEB_URL`: `https://www.urbanfix.com.ar`.

Launch integrations:

- `MP_ACCESS_TOKEN`: required for real Mercado Pago checkout.
- `MP_TEST_PAYER_EMAIL`: optional, useful for test payments.
- `RESEND_API_KEY`: required for real emails/newsletters.
- `RESEND_FROM_EMAIL`: sender email fallback.
- `NEWSLETTER_FROM_EMAIL`: required for newsletter/admin email sends.
- `NEWSLETTER_REPLY_TO_EMAIL`: optional reply-to.
- `NEWSLETTER_UNSUBSCRIBE_SECRET`: required before sending campaigns.

Admin/ops:

- `ROADMAP_AUTOSYNC_TOKEN`: required only if roadmap auto-sync is enabled.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_B64` or `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: required only for Play Store integration.
- `GOOGLE_PLAY_PACKAGE_NAME` / `ANDROID_PACKAGE`: required only for Play Store integration.
- `ALLOW_LEGACY_ACCESS_BACKFILL`: leave unset or `false` before launch.

## 2. Supabase Auth settings

In Supabase Auth settings:

- Site URL: `https://www.urbanfix.com.ar`.
- Redirect URLs:
  - `https://www.urbanfix.com.ar/tecnicos`
  - `https://www.urbanfix.com.ar/cliente`
  - `https://www.urbanfix.com.ar/admin`

For local QA only, keep these if the local browser is used:

- `http://127.0.0.1:3001/tecnicos`
- `http://127.0.0.1:3001/cliente`
- `http://127.0.0.1:3001/admin`
- `http://localhost:3000/tecnicos`
- `http://localhost:3000/cliente`
- `http://localhost:3000/admin`

Google OAuth:

- Supabase Google provider must be enabled with the live Google client credentials.
- Google Cloud authorized redirect URI must be the Supabase callback:
  - `https://<project-ref>.supabase.co/auth/v1/callback`
- No production config should point to `placeholder.supabase.co`.

## 3. Supabase database and storage

Use only canonical production migrations:

```text
apps/web/supabase/migrations
```

Do not bulk-apply old legacy SQL from:

```text
apps/web/lib/supabase/migrations
```

Required storage buckets:

- `urbanfix-assets`
- `beta-support`

Before launch, confirm access approval is still admin/server controlled:

- Public signup can create a profile.
- New technicians are not automatically approved.
- Admin can approve access.
- Browser clients cannot update `profiles.access_granted` directly.

## 4. Final checks

Run from `apps/web`:

```bash
npm run env-template:audit
npm run image-config:audit
npm run security-headers:audit
npm run supabase-client:audit
npm run supabase:migrations:audit
npm run storage:audit
npm run api-routes:audit
npm run production:audit
```

Expected before real launch:

- No `FAIL` entries in `production:audit`.
- Optional integrations may remain as `WARN` only if they are intentionally deferred.
- `ALLOW_LEGACY_ACCESS_BACKFILL` is not active.

## 5. Production smoke test

After Vercel deploy finishes:

- Open `https://www.urbanfix.com.ar`.
- Open `/tecnicos` and sign in with email/password.
- Test Google login for technician.
- Create one test technician account.
- Approve that technician from `/admin`.
- Enter the technician panel and confirm dashboard loads.
- Create or load a client request.
- Create one quote and open its public quote link.
- Approve the quote from the public link.
- Confirm quote feedback/review flow.
- Confirm notification endpoint rejects calls without `NOTIFY_WEBHOOK_SECRET`.

If any test still redirects to `placeholder.supabase.co`, stop and re-check Vercel production variables and Supabase Auth redirect settings.
