# GitHub Actions and Argo CD delivery

## Current state

GitHub Actions CI is configured in `.github/workflows/ci.yml`.
It runs on pushes to main, pull requests targeting main, and manual dispatch.
It uses Node.js 24 and read-only repository permissions.
It runs the existing controlled backend checks without downloading app dependencies.

The Argo CD file in `deploy/argocd/application.yaml.example` is a configuration template only.
It is not installed in a cluster, does not contain a workload, and has automatic sync disabled.

## Runtime blocker

The exported app uses `@appdeploy/client` and `@appdeploy/sdk`.
AppDeploy injects these integrations for its authentication, HTTP routing, and database.
The repository does not contain a standalone runtime, a container image, or Kubernetes workloads.

Argo CD reconciles Kubernetes manifests to a registered Kubernetes/OpenShift cluster.
It does not deploy the current app into AppDeploy hosting.
A container that merely runs Vite or copies the exported backend would not provide working sign-in or persistent progress.

## Required target information

- Target platform: OpenShift, Kubernetes, or a local cluster.
- Cluster API URL or registered Argo CD cluster name, and workload namespace.
- Existing Argo CD URL, control-plane namespace, and permitted AppProject.
- Image registry and image repository. GHCR is a possible choice.
- Application hostname and ingress/route setup.
- Identity provider for the standalone app, including issuer and client registration.
- PostgreSQL or another persistent backend, storage arrangement, and secret delivery method.

Provide service locations and names. Credentials belong in an appropriate secret store, not in this public repository or chat.

## Planned automated delivery

1. Pull request CI validates application code, curriculum synchronization, and backend behavior.
2. After a reviewed merge, GitHub Actions builds and tests a standalone app container.
3. GitHub Actions publishes the image to the selected registry and resolves its immutable digest.
4. A manifest change proposes that digest in the GitOps source, preferably through a pull request.
5. After the GitOps change merges, Argo CD reconciles it into the target namespace.
6. Deployment readiness, sign-in, private progress persistence, and account isolation are verified in the target environment.

Use a separate GitOps repository for independent deployment review when available. A dedicated directory in this repository is an alternative.
Argo CD auto-sync reads the desired state from Git. GitHub Actions does not need a cluster-admin token or an Argo CD API token for that pattern.

## Activation work after target selection

- Replace the AppDeploy SDK integrations with a supported standalone authentication, API, and persistence implementation.
- Build and test a container compatible with the target security policy. For OpenShift, support a non-root arbitrary UID.
- Add resource requests and limits, readiness/liveness checks, Service, route/Ingress, and persistence configuration.
- Provision secrets outside Git and restrict backend records to their authenticated owner.
- Add a CI build/publish job, lock dependencies, and commit immutable image digests.
- Fill the Argo CD template with real project, destination, and manifest-path values.
- Validate the first deployment manually. Then enable automated sync and self-heal according to the target policy.

## Official references

- GitHub workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Argo CD automated sync: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD CI automation: https://argo-cd.readthedocs.io/en/stable/user-guide/ci_automation/
