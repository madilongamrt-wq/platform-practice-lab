# Free hosting migration

Status: public Supabase project configuration is supplied in config/public.json. Database readiness and GitHub Pages activation are verified separately.

## Target

- Frontend: GitHub Pages, using the public repository.
- Sign-in: Supabase email/password accounts.
- Persistence: Supabase PostgreSQL with row-level security.
- Expected address after activation: https://madilongamrt-wq.github.io/platform-practice-lab/
- The existing AppDeploy app stays available during preparation.

These are free-tier services with usage limits. Supabase free projects may pause when inactive. Do not upgrade plans or add paid resources as part of this setup.

## 1. Connect Supabase

Create a free account at https://supabase.com/dashboard/sign-up and connect the Supabase integration in ChatGPT.
Create one project in a Free organization. Retain its generated database password privately.
When connected, the schema can be applied through the integration.

Apply `supabase/migrations/20261021_lab_progress.sql` once to a new project.
The migration creates only the app's progress table, access policies, and save function.
It does not change Supabase's auth.users schema.

## 2. Provision sign-in accounts

For the first private lab account, use Supabase Authentication > Users > Add user > Create new user.
Provide an email and a strong unique password through Supabase's own interface. Mark the account confirmed through the trusted administrative flow when appropriate.
Never send the password in chat or store it in Git.
This version exposes sign-in only. It does not allow visitors to create accounts.

This approach does not depend on Supabase's default email delivery.
For public self-service registration or password recovery, configure a verified email provider first.
Supabase's built-in email service is restricted and is not a public production mail service.
Accounts and passwords from AppDeploy do not transfer automatically.

## 3. Public client settings

The owner supplied the project URL and publishable key in config/public.json.
These settings are designed for browser use. They grant no authenticated user identity.
The frontend supports VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY overrides for local development.
Never place privileged keys, database passwords, or account passwords in that file.

## 4. Enable GitHub Pages

In repository Settings > Pages, choose GitHub Actions as the source.
The available GitHub connector cannot change this administrative setting.
Once CI passes and the migration merges, Deploy GitHub Pages automatically builds and deploys on main pushes.
The deployment first runs tools/check-supabase.py. It refuses to proceed if the project key is invalid, the schema is missing, or anonymous progress access is allowed.
If Pages is not enabled, enable it and rerun the failed deployment from Actions.
No extra repository variables are needed for the supplied public configuration.

## 5. Verify before switching users

- Confirm the deployment workflow succeeds and the expected Pages URL loads.
- Sign in as account A, solve an exercise, refresh, and verify saved progress.
- Sign out. Sign in as account B and verify A's answers are absent.
- Complete hints, reveal a solution, reset an exercise, and verify after refresh.
- Install from Chrome on Android and Safari on iPhone.
- Test an offline launch, then reconnect and verify access.
- Keep the original app available until the new sign-in and persistence checks pass.

Old progress in AppDeploy is not imported by this migration.
Any future import must map verified old identities to new Supabase user IDs. Do not copy records into another user's account based only on unverified email input.

## Local development

Node.js 24 or newer:

```bash
npm install
cp .env.example .env.local
# Set the public Supabase project URL and publishable key in .env.local
npm run dev
```

For a Pages build:

```bash
VITE_BASE_PATH=/platform-practice-lab/ npm run build
```

The frontend now uses a normal public npm SDK and no injected AppDeploy runtime.
The backend/ folder remains a historical reference for the original implementation and its regression checks. It is not part of the new deployment.

## Tests

Lab CI runs standalone grading checks, legacy grading regression, PWA checks, TypeScript validation, and a Pages-path production build.
A separate job uses a real PostgreSQL service to apply the migration and prove owner isolation, anonymous denial, idempotent saves, revision conflicts, and reset persistence.
The CI auth.uid fixture simulates verified user IDs. It does not replace a live Supabase Auth acceptance test.

Scores are for self-practice and are calculated in the browser. Users can modify their own scores through developer tools. Scores must not be treated as exam certificates or trusted leaderboard results.
Database policies enforce privacy regardless of the browser's user filter.

The GitHub Pages domain has a different browser origin from AppDeploy. An existing home-screen installation will continue opening the old app. Install the new Pages app after activation.

## References

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://supabase.com/pricing
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/auth/auth-smtp
