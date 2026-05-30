# Supabase migrations

Canonical production folder:

```text
apps/web/supabase/migrations
```

Legacy reference folder:

```text
apps/web/lib/supabase/migrations
```

The legacy folder contains older schema files, seed data, roadmap history, and placeholders. Do not bulk-apply that folder to production.

Before launch, run:

```bash
npm run supabase:migrations:audit
npm run production:audit
```

If `supabase:migrations:audit` fails, review the missing production-critical SQL and promote only the migrations that the live database needs. Seed, roadmap, and placeholder files should stay out of production unless there is an explicit operational reason.

For an existing live Supabase project, compare the real schema first. Do not run old legacy SQL blindly against production, because some historical files may already be applied outside the current migration folder.

Launch order:

1. Configure Vercel production environment variables.
2. Confirm Supabase URL and service role credentials point to the live project.
3. Apply audited production migrations.
4. Run the migration and production audits.
5. Test signup, login, technician panel, client flow, quote creation, billing, and notifications.

Access approval must stay server/admin controlled. Browser clients should never insert or update `profiles.access_granted` or `profiles.access_granted_at` directly.
