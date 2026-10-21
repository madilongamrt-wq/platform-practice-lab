# Platform Practice Lab

Ten simulated platform engineering incidents with private progress, progressive hints, explained solutions, and a mobile home-screen experience.

## Migration status

This branch prepares a move from AppDeploy to GitHub Pages and Supabase.
The Supabase public project configuration is supplied. Database readiness, sign-in accounts, and GitHub Pages activation still require verification.
The existing app remains at https://platform-practice-lab-mwcv1o.v2.appdeploy.ai/ during preparation.

Read [the complete setup and verification guide](docs/free-hosting.md).

## Architecture

- React and Vite frontend in src/.
- Supabase email/password sign-in through src/client.ts.
- Per-user PostgreSQL progress with RLS and a revision-checked save RPC.
- Browser-based simulated grading in src/grading.ts. Commands never execute.
- Ten exercise definitions in src/exercises.ts.
- Installable PWA with public-only offline fallback.
- GitHub Actions build, regression, database isolation, and gated Pages deployment.

The new frontend has no AppDeploy SDK dependency. backend/ preserves the original AppDeploy implementation for reference.

## Develop

Use Node.js 24 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set only the public Supabase HTTPS URL and sb_publishable_ key in .env.local.
Accounts must be provisioned in Supabase. Never commit credentials or privileged keys.

## Verify

```bash
node --disable-warning=ExperimentalWarning tools/test-grading.cjs
node --disable-warning=ExperimentalWarning tools/test-backend.cjs
node --disable-warning=ExperimentalWarning tools/test-pwa.cjs
VITE_BASE_PATH=/platform-practice-lab/ npm run build
node tools/test-pages-build.cjs
```

The PostgreSQL isolation suite runs in CI against a fresh test database.
Live sign-in and real account acceptance checks remain required after connecting Supabase.

## Privacy and scoring

The database restricts rows to the authenticated owner using auth.uid().
The save RPC locks the owner's row, checks the expected revision, and handles replay of the latest request.
The app keeps at most 30 recent attempt entries per exercise and trims older entries when needed to keep record size bounded.
Scoring is self-practice feedback, not a tamper-proof certification system.

## Cost

GitHub Pages and Supabase Free are the intended services. Free tiers have quotas and service limits.
This migration does not provision paid resources or activate a new hosting subscription.
