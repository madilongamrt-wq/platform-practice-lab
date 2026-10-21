
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const context = {};
vm.createContext(context);
vm.runInContext(
  stripTypeScriptTypes(fs.readFileSync(path.join(root,'src/exercises.ts'),'utf8'), {mode:'strip'})
    .replace('export const exercises','const exercises') + '\nthis.list=exercises;', context
);
vm.runInContext(
  stripTypeScriptTypes(fs.readFileSync(path.join(root,'src/grading.ts'),'utf8'), {mode:'strip'})
    .replace(/^import .*;$/gm,'').replace(/^export /gm,'') +
    '\nthis.grade={applyAction,emptyProgress};', context
);
let n=0;
for (const e of context.list) {
  const empty=context.grade.emptyProgress(e.id);
  const p=context.grade.applyAction(empty,'submit',e.commands,'r'+(++n));
  assert.equal(p.completed,true,e.id);
  assert.equal(p.score,100,e.id);
  assert.equal(empty.attempts,0,'prior state must not mutate');
}
let p=context.grade.emptyProgress('crashloop');
for(let i=0;i<4;i++)p=context.grade.applyAction(p,'hint','','h'+i);
assert.equal(p.hints,3);
p=context.grade.applyAction(p,'solution','','s');
p=context.grade.applyAction(p,'submit',context.list[0].commands,'answer');
assert.equal(p.score,40);
assert.equal(context.grade.applyAction(p,'submit','ignored','answer'),p,'duplicate request is idempotent');
p=context.grade.applyAction(p,'reset','','reset');
assert.equal(p.history.length,0);assert.equal(p.revealed,false);assert.equal(p.score,0);
assert.throws(()=>context.grade.applyAction(p,'submit',' ','empty'));
console.log('PASS: standalone scoring across all ten examples, assistance, idempotency and reset.');
