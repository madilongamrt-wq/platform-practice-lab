
import { exercises } from './exercises';

export type Progress = {
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
export const emptyProgress = (id: string): Progress => ({
  id, revision: 0, attempts: 0, hints: 0, revealed: false,
  passed: [], history: [], completed: false, score: 0, requestId: ''
});

export function applyAction(prior: Progress, action: string, command: string, requestId: string): Progress {
  const exercise = exercises.find(e => e.id === prior.id);
  if (!exercise || !['submit', 'hint', 'solution', 'reset'].includes(action)) throw new Error('Unknown exercise or action');
  if (action === 'submit' && (!command.trim() || command.length > 8000)) throw new Error('Enter 1 to 8000 characters.');
  if (prior.requestId === requestId) return prior;
  let next = { ...prior, revision: prior.revision + 1, requestId, passed: [...prior.passed], history: [...prior.history] };
  if (action === 'reset') return { ...emptyProgress(prior.id), revision: next.revision, requestId };
  if (action === 'hint') next.hints = Math.min(3, prior.hints + 1);
  if (action === 'solution') next.revealed = true;
  let feedback = '';
  if (action === 'submit') {
    command = command.trim();
    const normalized = command.replace(/\s+(?:-n|--namespace)(?:=|\s+)\S+/g, '')
      .replace(/--previous=true/g, '--previous').replace(/--timeout\s+120s/g, '--timeout=120s');
    const unsafe = /cluster-admin|\|\|\s*true|--force\b|delete\s+(?:ns|namespace)\b/i.test(command);
    const matches = unsafe ? [] : exercise.checks.filter(c =>
      new RegExp(c.pattern, 'i').test(normalized) || new RegExp(c.pattern, 'i').test(command));
    next.passed = [...new Set([...prior.passed, ...matches.map(c => c.label)])];
    next.attempts++;
    next.completed = exercise.checks.every(c => next.passed.includes(c.label));
    const missing = exercise.checks.filter(c => !next.passed.includes(c.label)).map(c => c.label);
    feedback = unsafe ? 'Guardrail: this command masks failures or grants excessive access. No checks awarded.' :
      (matches.map(c => c.label + ': ' + c.output).join('\n') || 'No supported command pattern matched. Review the hints and example syntax.') +
      '\n' + (missing.length ? 'Still needed: ' + missing.join(', ') : 'Completion check passed. All objectives covered.');
  }
  const coverage = Math.round(100 * next.passed.length / exercise.checks.length);
  next.score = Math.max(0, Math.min(next.revealed ? 40 : 100, coverage - next.hints * 5));
  if (action === 'submit') {
    feedback += '\nScore: ' + coverage + '% objective coverage minus ' + next.hints * 5 +
      ' hint points' + (next.revealed ? ', capped at 40 after solution reveal.' : '.');
    next.history = [...prior.history, { command, feedback, score: next.score }].slice(-30);
    while (JSON.stringify(next).length > 60000 && next.history.length > 1) next.history.shift();
  }
  return next;
}
