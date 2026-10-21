export const exercises = [
  {
    id: 'crashloop',
    topic: 'Kubernetes / OpenShift',
    title: 'The restart loop',
    difficulty: 'Intermediate',
    minutes: 15,
    signal: 'CrashLoopBackOff',
    scenario:
      'A new release of ledger-api in the fictional copper-lab namespace restarts every 20 seconds. The previous image was healthy. Restore service using evidence, then verify the rollout.',
    symptoms: [
      'ledger-api-7c9 has restarted 8 times',
      'Service has no ready endpoints',
      'Only the new revision fails',
    ],
    evidence:
      '$ oc get pods -n copper-lab\nledger-api-7c9  0/1  CrashLoopBackOff  8\n$ oc logs ledger-api-7c9 -n copper-lab --previous\nFATAL: required environment variable DB_HOST is missing\n$ oc get deploy ledger-api -n copper-lab -o yaml\nenv: []',
    challenge:
      'Inspect the previous container logs, restore DB_HOST=db.copper-lab.svc on deployment ledger-api, and verify the rollout.',
    hints: [
      'The container exits before probes matter. Inspect its previous instance.',
      'Compare the required environment variable with the deployment.',
      'Use oc set env deployment/ledger-api DB_HOST=db.copper-lab.svc, then rollout status.',
    ],
    solution:
      'Read previous logs to identify the missing variable. Set the known fictional database hostname on the deployment. This creates a new revision. Wait for rollout status, then check readiness and service endpoints. A restart alone repeats the failure.',
    commands:
      'oc logs ledger-api-7c9 -n copper-lab --previous\noc set env deployment/ledger-api DB_HOST=db.copper-lab.svc -n copper-lab\noc rollout status deployment/ledger-api -n copper-lab',
    checks: [
      {
        label: 'Inspect previous logs',
        pattern: '(?:oc|kubectl)\\s+logs[^\\n]*(?:--previous|-p\\b)',
        output: 'FATAL: required environment variable DB_HOST is missing',
      },
      {
        label: 'Restore the required environment',
        pattern:
          '(?:oc|kubectl)\\s+set\\s+env[^\\n]*ledger-api[^\\n]*DB_HOST=db\\.copper-lab\\.svc',
        output: 'deployment.apps/ledger-api updated (simulation)',
      },
      {
        label: 'Verify the rollout',
        pattern: '(?:oc|kubectl)\\s+rollout\\s+status[^\\n]*ledger-api',
        output: 'deployment ledger-api successfully rolled out (simulation)',
      },
    ],
    completion: 'All three checks pass: inspect, repair, and verify.',
  },
  {
    id: 'readiness',
    topic: 'Kubernetes / OpenShift',
    title: 'Running is not ready',
    difficulty: 'Intermediate',
    minutes: 12,
    signal: 'Readiness failed',
    scenario:
      'catalog-api runs without restarts, but receives no traffic after a probe change. Diagnose the probe and fix its path without disabling health checks.',
    symptoms: [
      'Pod is Running with 0/1 Ready',
      'Readiness gets HTTP 404',
      'App serves health on /health/ready',
    ],
    evidence:
      '$ oc describe pod catalog-api-65 -n copper-lab\nReadiness probe failed: HTTP probe failed with statuscode: 404\nreadinessProbe:\n  httpGet:\n    path: /ready\n    port: 8080\nApplication log: GET /health/ready -> 200',
    challenge:
      'Describe the pod, patch the readiness path on deployment catalog-api to /health/ready, and check its rollout.',
    hints: [
      'Running describes process state, not traffic eligibility.',
      'The probe path and application route differ.',
      'Patch /spec/template/spec/containers/0/readinessProbe/httpGet/path.',
    ],
    solution:
      'The probe calls a nonexistent route. Patch only its path to /health/ready, keep the probe enabled, then verify rollout and ready endpoints. Raising delays does not fix a 404.',
    commands:
      'oc describe pod catalog-api-65 -n copper-lab\noc patch deployment catalog-api -n copper-lab --type=json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/health/ready"}]\'\noc rollout status deployment/catalog-api -n copper-lab',
    checks: [
      {
        label: 'Inspect probe failure',
        pattern: '(?:oc|kubectl)\\s+describe\\s+(?:pod|po)[^\\n]*catalog-api',
        output: 'Readiness probe failed: HTTP 404 at /ready',
      },
      {
        label: 'Repair readiness path',
        pattern:
          '(?:oc|kubectl)\\s+patch[^\\n]*catalog-api[^\\n]*readinessProbe[^\\n]*/health/ready',
        output: 'deployment.apps/catalog-api patched; readiness now 200',
      },
      {
        label: 'Verify rollout',
        pattern: '(?:oc|kubectl)\\s+rollout\\s+status[^\\n]*catalog-api',
        output: 'catalog-api successfully rolled out',
      },
    ],
    completion:
      'Probe evidence, a targeted patch, and rollout verification all pass.',
  },
  {
    id: 'rbac',
    topic: 'Kubernetes / OpenShift',
    title: 'Permission denied',
    difficulty: 'Intermediate',
    minutes: 15,
    signal: 'Forbidden',
    scenario:
      'The report-reader service account cannot list pods in copper-lab. Grant only pod get/list/watch in that namespace, without cluster-wide access.',
    symptoms: [
      'Job reports pods is forbidden',
      'Service account authentication succeeds',
      'No existing suitable Role exists',
    ],
    evidence:
      'Error from server (Forbidden): pods is forbidden:\nUser "system:serviceaccount:copper-lab:report-reader" cannot list resource "pods"\nRequired verbs: get,list,watch\nRequired namespace: copper-lab',
    challenge:
      'Check permissions, create Role pod-reader with get/list/watch on pods, and bind it to service account copper-lab:report-reader.',
    hints: [
      'Check authorization with auth can-i and impersonation.',
      'A namespaced Role is sufficient.',
      'Create a Role and a RoleBinding, not cluster-admin.',
    ],
    solution:
      'Use auth can-i to reproduce the denied permission. Create a namespaced Role with the three required verbs and a RoleBinding for report-reader. Repeat can-i after the grant. Avoid edit or cluster-admin for a read-only job.',
    commands:
      'oc auth can-i list pods --as=system:serviceaccount:copper-lab:report-reader -n copper-lab\noc create role pod-reader --verb=get,list,watch --resource=pods -n copper-lab\noc create rolebinding report-pods --role=pod-reader --serviceaccount=copper-lab:report-reader -n copper-lab',
    checks: [
      {
        label: 'Check authorization',
        pattern:
          '(?:oc|kubectl)\\s+auth\\s+can-i[^\\n]*pods[^\\n]*report-reader',
        output: 'Before grant: no. After binding: yes (simulation)',
      },
      {
        label: 'Create least-privilege Role',
        pattern:
          'create\\s+role\\s+pod-reader[^\\n]*--verb=(?:get,list,watch|list,get,watch|watch,list,get)[^\\n]*--resource=pods',
        output: 'role.rbac.authorization.k8s.io/pod-reader created',
      },
      {
        label: 'Bind the service account',
        pattern:
          'create\\s+rolebinding[^\\n]*--role=pod-reader[^\\n]*--serviceaccount=copper-lab:report-reader',
        output: 'rolebinding/report-pods created',
      },
    ],
    completion: 'Check authorization and create a scoped Role plus binding.',
  },
  {
    id: 'pvc',
    topic: 'Kubernetes / OpenShift',
    title: 'Storage at the limit',
    difficulty: 'Advanced',
    minutes: 18,
    signal: 'ENOSPC',
    scenario:
      'archive-worker fails writes. PVC archive-data is 99% full. The fictional fast-expand StorageClass allows expansion and has spare backend capacity. Increase the claim to 20Gi.',
    symptoms: [
      'No space left on device',
      'Claim is Bound at 10Gi',
      'No recent growth alert fired',
    ],
    evidence:
      '$ df -h /archive\n/dev/mock 10G 9.9G 0.1G 99% /archive\nPVC: archive-data, request: 10Gi, class: fast-expand\nStorageClass: allowVolumeExpansion: true\nBackend free capacity: 100Gi',
    challenge:
      'Inspect the StorageClass, patch PVC archive-data to request 20Gi, then inspect the PVC conditions.',
    hints: [
      'Confirm expansion support and backend capacity before changing the request.',
      'Change the PVC request, not the PV capacity directly.',
      'Check for FileSystemResizePending and verify filesystem size after expansion.',
    ],
    solution:
      'Validate allowVolumeExpansion and capacity. Patch the PVC request to 20Gi. Inspect conditions and filesystem size. Follow the CSI driver procedure if offline filesystem resizing is required. Add growth forecasting after service recovery.',
    commands:
      'oc get storageclass fast-expand -o yaml\noc patch pvc archive-data -n copper-lab -p \'{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}\'\noc describe pvc archive-data -n copper-lab',
    checks: [
      {
        label: 'Check expansion support',
        pattern:
          '(?:oc|kubectl)\\s+(?:get|describe)\\s+(?:storageclass|sc)\\s+fast-expand',
        output: 'allowVolumeExpansion: true; backend free: 100Gi',
      },
      {
        label: 'Expand the claim',
        pattern: '(?:oc|kubectl)\\s+patch\\s+pvc\\s+archive-data[^\\n]*20Gi',
        output: 'persistentvolumeclaim/archive-data patched (simulation)',
      },
      {
        label: 'Inspect resize conditions',
        pattern: '(?:oc|kubectl)\\s+(?:describe|get)\\s+pvc\\s+archive-data',
        output:
          'Capacity: 20Gi; Conditions: none; filesystem: 20Gi (simulation)',
      },
    ],
    completion: 'Expansion support, request change, and verification pass.',
  },
  {
    id: 'jenkins',
    topic: 'CI/CD',
    title: 'A green build, a broken release',
    difficulty: 'Advanced',
    minutes: 20,
    signal: 'ImagePullBackOff',
    scenario:
      'Jenkins builds invoice-api with the Git SHA but deploys the build number. Pods cannot pull the nonexistent tag. Repair the pipeline and ensure rollout failure fails the job.',
    symptoms: [
      'Jenkins job reports success',
      'New pods show ImagePullBackOff',
      'Registry contains Git SHA tags only',
    ],
    evidence:
      "Jenkinsfile:\nsh 'docker build -t registry.example.test/invoice-api:${GIT_COMMIT} .'\nsh 'docker push registry.example.test/invoice-api:${GIT_COMMIT}'\nsh 'oc set image deployment/invoice-api api=registry.example.test/invoice-api:${BUILD_NUMBER}'\nsh 'oc rollout status deployment/invoice-api || true'",
    challenge:
      'Enter corrected Jenkins sh commands using GIT_COMMIT for deployment and rollout status with a 120s timeout that propagates failure.',
    hints: [
      'Compare the published and deployed tags.',
      'Use the same immutable tag across build, push, and deploy.',
      'Remove || true from rollout verification.',
    ],
    solution:
      'Deploy exactly the Git SHA tag published by the build. Verify rollout with a bounded timeout and let its nonzero exit code fail the pipeline. For stronger provenance, deploy the resolved image digest.',
    commands:
      "sh 'oc set image deployment/invoice-api api=registry.example.test/invoice-api:${GIT_COMMIT} -n copper-lab'\nsh 'oc rollout status deployment/invoice-api --timeout=120s -n copper-lab'",
    checks: [
      {
        label: 'Deploy the published immutable tag',
        pattern: 'set\\s+image[^\\n]*invoice-api[^\\n]*GIT_COMMIT',
        output:
          'deployment.apps/invoice-api image updated to published SHA tag',
      },
      {
        label: 'Bound and enforce rollout verification',
        pattern: 'rollout\\s+status[^\\n]*invoice-api[^\\n]*--timeout=120s',
        output: 'Jenkins sh step propagates rollout exit status',
      },
    ],
    completion:
      'Use the matching tag and rollout verification without masking errors.',
  },
  {
    id: 'gitops',
    topic: 'CI/CD',
    title: 'GitOps keeps reverting the fix',
    difficulty: 'Advanced',
    minutes: 15,
    signal: 'Drift loop',
    scenario:
      'A manual replica increase disappears after Argo CD sync. Git defines one replica, but the approved service requirement is three. Make a durable change through the repository.',
    symptoms: [
      'Manual scale to 3 returns to 1',
      'Argo CD self-heal enabled',
      'No HPA manages this deployment',
    ],
    evidence:
      'apps/search/deployment.yaml:\nkind: Deployment\nmetadata:\n  name: search-api\nspec:\n  replicas: 1\nArgo CD: automated.selfHeal=true\nApproved requirement: replicas=3',
    challenge:
      'Enter a yq command setting replicas to 3, a git commit for the manifest, and an Argo CD sync command for search-lab after review and merge.',
    hints: [
      'Git is the desired-state source.',
      'Change apps/search/deployment.yaml and submit a reviewed commit.',
      'After merge, sync search-lab and verify health.',
    ],
    solution:
      'Edit the Git manifest, review the diff, commit and submit the change through review. After merge, sync and confirm three ready replicas. Manual scaling is temporary while self-heal owns desired state.',
    commands:
      'yq -i \'.spec.replicas = 3\' apps/search/deployment.yaml\ngit add apps/search/deployment.yaml\ngit commit -m "Set search replicas to three"\nargocd app sync search-lab\nargocd app wait search-lab --health',
    checks: [
      {
        label: 'Update desired state',
        pattern:
          'yq[^\\n]*replicas\\s*=\\s*3[^\\n]*apps/search/deployment.yaml',
        output: 'Git manifest desired replicas: 3',
      },
      {
        label: 'Record a reviewed change',
        pattern: 'git\\s+commit\\s+-m',
        output: 'Commit prepared. Review and merge are required before sync.',
      },
      {
        label: 'Reconcile the application',
        pattern: 'argocd\\s+app\\s+sync\\s+search-lab',
        output: 'After approved merge: Synced, Healthy, ready replicas 3/3',
      },
    ],
    completion: 'Edit Git, commit for review, and reconcile after merge.',
  },
  {
    id: 'alerts',
    topic: 'Monitoring',
    title: 'The noisy pager',
    difficulty: 'Intermediate',
    minutes: 15,
    signal: 'Alert fatigue',
    scenario:
      'A brief scrape failure pages the on-call engineer every few minutes. The rule fires immediately for a noncritical target. Add a persistence window and route the alert as a warning.',
    symptoms: [
      '12 pages in one hour',
      'Scrape failures last under 60 seconds',
      'Service SLO stays healthy',
    ],
    evidence:
      '- alert: LabTargetDown\n  expr: up{job="demo-exporter"} == 0\n  for: 0m\n  labels:\n    severity: critical\nRule file: rules/lab.yml\nApproved policy: warning after 5m, page only on user-impact alerts',
    challenge:
      'Enter a corrected YAML alert rule with a 5m duration and warning severity, then validate rules/lab.yml with promtool.',
    hints: [
      'A persistence window filters transient failures.',
      'Use for: 5m and severity: warning.',
      'Run promtool check rules before applying.',
    ],
    solution:
      'Retain the failure expression, add a 5m persistence window, and change severity to warning. Validate rule syntax and check routing. Keep user-impact SLO alerts responsible for paging. Review missed detection risk before adopting the window elsewhere.',
    commands:
      '- alert: LabTargetDown\n  expr: up{job="demo-exporter"} == 0\n  for: 5m\n  labels:\n    severity: warning\npromtool check rules rules/lab.yml',
    checks: [
      {
        label: 'Retain the failure condition',
        pattern: 'expr:\\s*up[^\\n]*==\\s*0',
        output: 'Expression retains detection for down targets',
      },
      {
        label: 'Reduce transient paging',
        pattern: 'for:\\s*5m[\\s\\S]*severity:\\s*warning',
        output: 'Alert waits 5 minutes and routes at warning severity',
      },
      {
        label: 'Validate the rule',
        pattern: 'promtool\\s+check\\s+rules\\s+rules/lab.yml',
        output: 'SUCCESS: 1 rule found (simulation)',
      },
    ],
    completion:
      'Preserve detection, add duration and severity, validate syntax.',
  },
  {
    id: 'latency',
    topic: 'Monitoring',
    title: 'Averages hide the slow requests',
    difficulty: 'Advanced',
    minutes: 18,
    signal: 'p95 latency',
    scenario:
      'Users report slow checkout while mean latency remains low. Use a classic Prometheus histogram to inspect p95, then check deployment resource pressure.',
    symptoms: [
      'Average latency 120ms',
      'Users report 2-second checkout',
      'CPU throttling rose after release',
    ],
    evidence:
      'Metric: http_request_duration_seconds_bucket\nLabels: job="checkout", le, instance\nDashboard shows mean only.\nContainer CPU limit: 100m\nCPU throttling ratio: 42%',
    challenge:
      'Enter a PromQL p95 query using histogram_quantile(0.95, sum by (le) (rate(...[5m]))), and inspect checkout pods with top.',
    hints: [
      'Quantiles expose a slow tail hidden by an average.',
      'Retain le when aggregating classic histogram buckets.',
      'Use rate over the bucket counters and inspect current resource use.',
    ],
    solution:
      'Compute the 95th percentile from bucket rates, preserving le. This query aggregates the checkout job across instances. Inspect CPU use and throttling, compare with release timing, then test a reviewed resource change. A quantile alone does not prove the cause.',
    commands:
      'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="checkout"}[5m])))\noc adm top pods -n copper-lab',
    checks: [
      {
        label: 'Compute p95 from bucket rates',
        pattern:
          'histogram_quantile\\(\\s*0\\.95[\\s\\S]*sum\\s+by\\s*\\(\\s*le\\s*\\)[\\s\\S]*rate\\([\\s\\S]*http_request_duration_seconds_bucket[\\s\\S]*checkout[\\s\\S]*\\[5m\\]',
        output: 'checkout p95: 2.1 seconds; mean: 0.12 seconds',
      },
      {
        label: 'Inspect pod resource usage',
        pattern: '(?:oc\\s+adm\\s+top\\s+pods|kubectl\\s+top\\s+pods)',
        output: 'checkout-api: CPU 100m / limit 100m; investigate throttling',
      },
    ],
    completion:
      'Use a valid p95 query and inspect resources before assigning cause.',
  },
  {
    id: 'bash',
    topic: 'Bash',
    title: 'A script that hides failures',
    difficulty: 'Intermediate',
    minutes: 12,
    signal: 'Exit code masked',
    scenario:
      'A Bash deployment check prints success after oc rollout status fails. Repair the script so errors stop execution and namespace values stay quoted.',
    symptoms: [
      'Exit code is 0 on a failed rollout',
      'Unquoted namespace breaks with empty input',
      'No bounded wait',
    ],
    evidence:
      '#!/usr/bin/env bash\nNAMESPACE=$1\noc rollout status deployment/worker -n $NAMESPACE\necho "Deployment healthy"',
    challenge:
      'Write a Bash script with set -euo pipefail, a required first argument, quoted namespace, and a 120s rollout timeout.',
    hints: [
      'Use strict mode to expose command and unset-variable errors.',
      'Require the namespace with ${1:?namespace required}.',
      'Quote "$NAMESPACE" and bound rollout status.',
    ],
    solution:
      'Strict mode stops this simple command sequence on rollout failure. Require the positional namespace and quote its expansion. A timeout prevents indefinite waiting. Remember errexit has exceptions in conditionals and pipelines, so test the full script structure.',
    commands:
      '#!/usr/bin/env bash\nset -euo pipefail\nNAMESPACE=${1:?namespace required}\noc rollout status deployment/worker -n "$NAMESPACE" --timeout=120s\necho "Deployment healthy"',
    checks: [
      {
        label: 'Enable strict mode',
        pattern: 'set\\s+-euo\\s+pipefail',
        output: 'Strict mode enabled for this simulated script',
      },
      {
        label: 'Require and quote namespace',
        pattern:
          '\\$\\{1:\\?[^}]+\\}[\\s\\S]*["\\\']\\$\\{?NAMESPACE\\}?["\\\']',
        output: 'Missing namespace fails fast; namespace expansion is quoted',
      },
      {
        label: 'Bound the rollout',
        pattern: 'rollout\\s+status[^\\n]*worker[^\\n]*--timeout=120s',
        output:
          'Failed rollout returns nonzero and stops before success message',
      },
    ],
    completion:
      'Strict mode, required quoted input, and bounded verification pass.',
  },
  {
    id: 'incident',
    topic: 'Production incidents',
    title: 'Recover before investigating deeper',
    difficulty: 'Advanced',
    minutes: 20,
    signal: 'Release regression',
    scenario:
      'The fictional payments-sim service sees a 35% error rate after revision 8. Revision 7 was healthy. No schema migration occurred. The incident commander approved rollback.',
    symptoms: [
      '5xx jumped immediately after rollout',
      'All affected pods use revision 8',
      'Database and dependencies are healthy',
    ],
    evidence:
      'Deployment: payments-sim\nRevision 7: stable image sha256:aaa\nRevision 8: new image sha256:bbb\nError ratio: 35%, baseline: 0.2%\nNo schema or data migration. Rollback approval recorded.',
    challenge:
      'Inspect rollout history, undo to revision 7, and verify rollout within 120s. Then use the solution checklist to validate user impact.',
    hints: [
      'Use the deployment timeline to constrain the likely cause.',
      'A known-good, compatible revision provides a bounded mitigation.',
      'Use rollout undo --to-revision=7, then status and impact checks.',
    ],
    solution:
      'Confirm revision history and compatibility, then roll back to revision 7 under the recorded approval. Verify rollout, error rate, latency, and transaction health. Record the incident timeline and preserve revision 8 logs for investigation. Healthy pods alone do not establish recovery.',
    commands:
      'oc rollout history deployment/payments-sim -n copper-lab\noc rollout undo deployment/payments-sim --to-revision=7 -n copper-lab\noc rollout status deployment/payments-sim --timeout=120s -n copper-lab',
    checks: [
      {
        label: 'Inspect release history',
        pattern: '(?:oc|kubectl)\\s+rollout\\s+history[^\\n]*payments-sim',
        output: 'Revision 7 stable; revision 8 correlates with regression',
      },
      {
        label: 'Roll back to known-good revision',
        pattern:
          '(?:oc|kubectl)\\s+rollout\\s+undo[^\\n]*payments-sim[^\\n]*--to-revision=7',
        output: 'payments-sim rolled back to revision 7 (simulation)',
      },
      {
        label: 'Verify rollout with timeout',
        pattern:
          '(?:oc|kubectl)\\s+rollout\\s+status[^\\n]*payments-sim[^\\n]*--timeout=120s',
        output:
          'Rollout complete. Simulated 5xx 0.2%, p95 180ms. Confirm business health.',
      },
    ],
    completion:
      'History, approved rollback, and bounded rollout verification pass.',
  },
];
