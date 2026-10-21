import { router, json, error, requireAuth, db } from '@appdeploy/sdk';
import { exercises } from './exercises';

type Progress = {
  id: string;
  revision: number;
  attempts: number;
  hints: number;
  revealed: boolean;
  passed: string[];
  history: { command: string; feedback: string; score: number }[];
  completed: boolean;
  score: number;
  requestId: string;
};
const table = 'lab_progress';
const empty = (id: string): Progress => ({
  id,
  revision: 0,
  attempts: 0,
  hints: 0,
  revealed: false,
  passed: [],
  history: [],
  completed: false,
  score: 0,
  requestId: '',
});
const key = (userId: string, id: string) =>
  Array.from(userId)
    .map(c => c.codePointAt(0)!.toString(16))
    .join('_') +
  '-' +
  id;
const result = (p: Progress, id: string) => ({ ...p, id });

export const handler = router({
  'GET /api/progress': [
    requireAuth(),
    async ctx => {
      const ids = exercises.map(e => key(ctx.user!.userId, e.id));
      const rows = await db.get<Progress>(table, ids, { consistent: true });
      return json({
        progress: exercises.map((e, i) => result(rows[i] || empty(e.id), e.id)),
      });
    },
  ],
  'POST /api/progress/:id': [
    requireAuth(),
    async ctx => {
      const exercise = exercises.find(e => e.id === ctx.params.id);
      if (!exercise) return error('Unknown exercise', 404);
      const body = ctx.body as {
        action?: string;
        command?: string;
        requestId?: string;
        revision?: number;
      };
      if (
        !body ||
        !['submit', 'hint', 'solution', 'reset'].includes(body.action || '') ||
        typeof body.requestId !== 'string' ||
        body.requestId.length > 100 ||
        !body.requestId ||
        !Number.isSafeInteger(body.revision)
      )
        return error('Invalid action', 400);
      if (
        body.action === 'submit' &&
        (typeof body.command !== 'string' ||
          !body.command.trim() ||
          body.command.length > 8000)
      )
        return error('Enter 1 to 8000 characters.', 400);
      const id = key(ctx.user!.userId, exercise.id);
      let [prior] = await db.get<Progress>(table, [id], { consistent: true });
      if (!prior) {
        await db.tx.add(table, [{ ...empty(id), id }]);
        [prior] = await db.get<Progress>(table, [id], { consistent: true });
      }
      if (!prior)
        return error('Could not initialize progress. Reload and retry.', 503);
      if (prior.requestId === body.requestId)
        return json(result(prior, exercise.id));
      if (prior.revision !== body.revision)
        return error(
          'Progress changed in another tab. Reload before retrying.',
          409
        );
      let next = {
        ...prior,
        revision: prior.revision + 1,
        requestId: body.requestId,
      };
      if (body.action === 'reset')
        next = {
          ...empty(id),
          revision: next.revision,
          requestId: body.requestId,
        };
      if (body.action === 'hint') next.hints = Math.min(3, prior.hints + 1);
      if (body.action === 'solution') next.revealed = true;
      if (body.action === 'submit') {
        const command = body.command!.trim();
        // Text matching only. Never eval, spawn, exec, or send commands to infrastructure.
        const normalized = command
          .replace(/\s+(?:-n|--namespace)(?:=|\s+)\S+/g, '')
          .replace(/--previous=true/g, '--previous')
          .replace(/--timeout\s+120s/g, '--timeout=120s');
        const unsafe =
          /cluster-admin|\|\|\s*true|--force\b|delete\s+(?:ns|namespace)\b/i.test(
            command
          );
        const matches = unsafe
          ? []
          : exercise.checks.filter(c =>
              new RegExp(c.pattern, 'i').test(normalized) || new RegExp(c.pattern, 'i').test(command)
            );
        next.passed = [
          ...new Set([...prior.passed, ...matches.map(c => c.label)]),
        ];
        next.attempts = prior.attempts + 1;
        next.completed = exercise.checks.every(c =>
          next.passed.includes(c.label)
        );
        const coverage = Math.round(
          (100 * next.passed.length) / exercise.checks.length
        );
        next.score = Math.max(
          0,
          Math.min(next.revealed ? 40 : 100, coverage - next.hints * 5)
        );
        const missing = exercise.checks
          .filter(c => !next.passed.includes(c.label))
          .map(c => c.label);
        const feedback = unsafe
          ? 'Guardrail: this command masks failures or grants excessive access. No checks awarded.'
          : (matches.map(c => c.label + ': ' + c.output).join('\n') ||
              'No supported command pattern matched. Use the objective and hints to check syntax. This simulator supports the documented CLI patterns, not every valid tool syntax.') +
            '\n' +
            (missing.length
              ? 'Still needed: ' + missing.join(', ')
              : 'Completion check passed. All objectives covered.') +
            '\nScore: ' +
            coverage +
            '% objective coverage minus ' +
            next.hints * 5 +
            ' hint points' +
            (next.revealed ? ', capped at 40 after solution reveal.' : '.');
        next.history = [
          ...prior.history,
          { command, feedback, score: next.score },
        ].slice(-30);
      } else {
        const coverage = Math.round(
          (100 * next.passed.length) / exercise.checks.length
        );
        next.score = Math.max(
          0,
          Math.min(next.revealed ? 40 : 100, coverage - next.hints * 5)
        );
      }
      const [saved] = await db.tx.update(
        table,
        [{ id, record: next, if: { revision: prior.revision } }],
        { patch: true }
      );
      if (!saved)
        return error(
          'Progress changed in another tab. Reload before retrying.',
          409
        );
      return json(result(next, exercise.id));
    },
  ],
});
