# Platform Practice Lab

A mobile-friendly practice app for experienced OpenShift engineers preparing for SRE roles.

Live app: https://platform-practice-lab-mwcv1o.v2.appdeploy.ai/

## Features

- Ten fictional incidents across Kubernetes/OpenShift, CI/CD, monitoring, Bash, and incident response.
- Evidence, command-entry challenges, three progressive hints, explained solutions, and objective checks.
- Predefined command responses. Entered commands never execute.
- Per-user saved answers, attempts, hints, scores, and completion.
- Exercise reset, search, filters, and topic progress.

## Architecture

The React/Vite frontend calls protected backend routes using AppDeploy's client SDK.
The TypeScript backend uses AppDeploy authentication middleware and persistent database services.

- `src/App.tsx`: interface, sign-in flow, and progress views.
- `src/exercises.ts`: frontend curriculum.
- `backend/index.ts`: authenticated progress API and scoring.
- `backend/exercises.ts`: backend curriculum used for grading.
- `tests/tests.json`: five declarative browser workflow specifications.
- `tools/test-backend.cjs`: controlled backend regression checks.
- `vite.config.ts`: frontend build configuration.

Keep both exercise data files synchronized when editing the curriculum.

## Hosting and GitHub

This repository stores the exported source. The running app, authentication, and database remain hosted by AppDeploy.

AppDeploy app ID: `platform-practice-lab-mwcv1o`
Exported source version: `1792601673509`

The initial source was exported through AppDeploy's source API. Exporting source does not create a GitHub-to-AppDeploy deployment pipeline. Commits here do not automatically update the live app.

To update the existing app, use the connected AppDeploy workflow with the app ID above, supply changed source files, and wait for deployment and QA checks. Avoid creating a second app unintentionally.

## Local development limits

AppDeploy injects `@appdeploy/client` and `@appdeploy/sdk` during its build/runtime. They are deliberately absent from package.json.

A plain `npm install` followed by `npm run dev` or `npm run build` outside AppDeploy does not supply those SDKs or the managed backend services. This export is not a standalone self-hosting package.

For development using the existing services, use AppDeploy's supported environment and SDK tooling. To host on OpenShift, Azure, or another provider, replace the SDK integrations with your own authentication, API transport, database adapter, and deployment configuration.

## Repeatable backend checks

Requirements: Node.js 24 or newer. No package installation or credentials are required for these controlled checks.

```bash
node --disable-warning=ExperimentalWarning tools/test-backend.cjs
```

The checks load the exported TypeScript with Node's type-stripping API and mock the SDK router, identity context, and database. They cover all ten worked solutions, kubectl alternatives, anonymous denial, user isolation, state readback, empty input, hints, solution scoring, revision conflicts, reset, and unsafe-command scoring.

These checks do not verify an external sign-in provider, actual AppDeploy database durability, or browser rendering.

## Validation at export

- AppDeploy reported the deployment ready with no captured frontend, backend, or network errors.
- Controlled backend regression checks passed.
- The declarative browser tests are included, but AppDeploy returned no end-to-end QA run report.
- Live sign-in, real database persistence, and account separation still require verification in a signed-in live session.

## Scoring

Objectives receive equal credit. Revealing a hint subtracts five points. Viewing the solution caps the score at 40.
Completion means every objective matched, including assisted attempts.
Scoring uses text patterns, not a full shell, YAML, or PromQL parser. Some valid alternative syntax will not match.
The interface retains the most recent 30 attempt entries per exercise while keeping the total attempt count.

## Data privacy

Progress endpoints require AppDeploy authentication. The backend derives each record key from the authenticated user ID and exercise ID. Clients cannot choose another user's record key.
No credentials, access tokens, database records, or real infrastructure details are included in this export.
