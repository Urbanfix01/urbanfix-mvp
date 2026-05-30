# UrbanFix web

Next.js app deployed on Vercel.

## Local validation

Run these checks before pushing launch-related changes:

```bash
npm run env-template:audit
npm run image-config:audit
npm run security-headers:audit
npm run supabase:migrations:audit
npm run storage:audit
npm run api-routes:audit
npm run production:audit
```

`production:audit` also checks admin route protection, public API route classification, env template coverage, remote image config, Supabase migration coverage, Storage bucket policies, and required production variables.

## Production variables

Use `.env.example` as the source of truth for Vercel environment variable names. Do not commit real values.

Required before opening real users:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PUBLIC_WEB_URL`
- `NOTIFY_WEBHOOK_SECRET`

Launch integrations:

- `MP_ACCESS_TOKEN`
- `RESEND_API_KEY`
- `NEWSLETTER_FROM_EMAIL`

Operational/admin-only values are also documented in `.env.example`.

## Supabase

Canonical production migrations live in:

```text
apps/web/supabase/migrations
```

Legacy reference SQL lives in:

```text
apps/web/lib/supabase/migrations
```

Do not bulk-apply legacy SQL. Use `npm run supabase:migrations:audit` and apply only canonical migrations.

Required Storage buckets:

- `urbanfix-assets`
- `beta-support`

Run `npm run storage:audit` before launch to confirm bucket and policy migrations are present.
