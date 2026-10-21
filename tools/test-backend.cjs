
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const root = path.resolve(__dirname, '..');
if (typeof stripTypeScriptTypes !== 'function') {
  throw new Error('Run these checks with Node.js 24 or newer.');
}
const exerciseContext = {};
vm.createContext(exerciseContext);
vm.runInContext(
  stripTypeScriptTypes(fs.readFileSync(path.join(root, 'backend/exercises.ts'), 'utf8'), { mode: 'strip' })
    .replace('export const exercises', 'const exercises') + '\nthis.data = exercises;',
  exerciseContext
);
const exercises = exerciseContext.data;
const records = new Map();
let requests = 0;
let serial = 0;
const db = {
  get: async (_table, ids) => ids.map(id => structuredClone(records.get(id) || null)),
  tx: {
    add: async (_table, rows) => rows.map(record => {
      if (records.has(record.id)) return null;
      records.set(record.id, structuredClone(record));
      return record.id;
    }),
    update: async (_table, items) => items.map(item => {
      if (records.get(item.id)?.revision !== item.if.revision) return false;
      records.set(item.id, structuredClone(item.record));
      return true;
    })
  }
};
const context = {
  exercises, db,
  router: routes => routes,
  json: data => ({ statusCode: 200, data }),
  error: (message, statusCode) => ({ statusCode, message }),
  requireAuth: () => ctx => ctx.user ? undefined : { statusCode: 401 }
};
vm.createContext(context);
const backend = fs.readFileSync(path.join(root, 'backend/index.ts'), 'utf8');
vm.runInContext(
  stripTypeScriptTypes(backend, { mode: 'strip' })
    .replace(/^import .*;$/gm, '')
    .replace('export const handler', 'const handler') + '\nthis.routes = handler;',
  context
);
async function call(method, user, id, body) {
  requests++;
  const route = method === 'GET' ? 'GET /api/progress' : 'POST /api/progress/:id';
  for (const middleware of context.routes[route]) {
    const response = await middleware({
      user: user ? { userId: user } : null, params: { id }, body
    });
    if (response) return response;
  }
  throw new Error('Route returned no response');
}
async function get(user) {
  return (await call('GET', user)).data.progress;
}
async function act(user, id, action, command = '') {
  const progress = (await get(user)).find(row => row.id === id);
  const response = await call('POST', user, id, {
    action, command, revision: progress.revision, requestId: 'request-' + (++serial)
  });
  assert.equal(response.statusCode, 200);
  return response.data;
}
async function main() {
  assert.equal((await call('GET', null)).statusCode, 401);
  assert.equal((await call('POST', null, 'crashloop', {})).statusCode, 401);
  assert.equal((await call('POST', 'A', 'crashloop', {
    action: 'submit', command: ' ', revision: 0, requestId: 'invalid'
  })).statusCode, 400);

  assert.equal(exercises.length, 10);
  for (const exercise of exercises) {
    const commands = exercise.commands.replaceAll('oc ', 'kubectl ')
      .replace('kubectl adm top', 'kubectl top');
    const progress = await act('A', exercise.id, 'submit', commands);
    assert.equal(progress.completed, true, exercise.id + ' must complete');
    assert.equal(progress.score, 100, exercise.id + ' must score 100');
  }
  assert.equal((await get('A')).filter(row => row.completed).length, 10);
  assert.equal((await get('B')).every(row => row.history.length === 0), true);
  for (let hint = 1; hint <= 3; hint++) {
    assert.equal((await act('A', 'crashloop', 'hint')).hints, hint);
  }
  assert.equal((await act('A', 'crashloop', 'hint')).hints, 3);
  const assisted = await act('A', 'crashloop', 'solution');
  assert.equal(assisted.score, 40);
  assert.equal(assisted.revealed, true);
  assert.equal((await call('POST', 'A', 'crashloop', {
    action: 'hint', revision: 0, requestId: 'stale'
  })).statusCode, 409);
  const reset = await act('A', 'crashloop', 'reset');
  assert.equal(reset.attempts, 0);
  assert.equal(reset.hints, 0);
  assert.equal(reset.revealed, false);
  assert.equal(reset.completed, false);
  assert.equal((await act('A', 'crashloop', 'submit',
    'oc rollout status deployment/ledger-api || true')).passed.length, 0);
  const frontend = fs.readFileSync(path.join(root, 'src/exercises.ts'), 'utf8');
  const backendData = fs.readFileSync(path.join(root, 'backend/exercises.ts'), 'utf8');
  assert.equal(frontend, backendData, 'Curriculum copies must remain synchronized');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'tests/tests.json'), 'utf8')).length, 5);
  console.log('PASS: ' + requests + ' controlled backend requests; all 10 solutions and isolation, assistance, reset and validation checks passed.');
  console.log('Authentication and database are mocked. Live provider sign-in and database durability are not covered.');
}
main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
