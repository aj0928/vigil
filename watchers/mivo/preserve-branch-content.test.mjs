import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchParams, constrainRetryDispatch, rulesRefreshMessage, rulesVersion } from './bin/mivo-watcher.mjs';

const HEAD = 'a'.repeat(40);
const FEEDBACK = {
  key: 'review:r1', source: 'review', nativeId: 'r1', revision: 't', sha: HEAD,
  body: '**P1** concrete finding',
  user: { id: 41898282, login: 'github-actions[bot]', type: 'Bot' },
  category: 'actionable-fix',
};
const messageFor = (fresh) => dispatchParams({
  pr: { number: 1, id: 'PR_1', headRefOid: HEAD, title: 't' },
  mapping: {}, fresh, now: '2026-11-07T00:00:00Z', taskPath: '/tmp/task.json', home: '/tmp/home',
}).message;

// 规则的关键词：只允许按审查意见/CI 指到的内容改，不能用「PR 正文没提」之类的说法删掉分支里已有的功能。
const RULE_PHRASES = [
  /不得用 revert、删除/,
  /只有审查意见或 CI 失败明确指向这段内容时才能改它/,
  /正文说不含、分支里却有/,
  /preserve-branch-content/,
];

function assertRule(message, label) {
  for (const phrase of RULE_PHRASES) assert.match(message, phrase, `${label} must carry the preserve-branch-content rule`);
}

test('repair dispatch carries the preserve-branch-content rule for code and no-code batches', () => {
  assertRule(messageFor([]), 'no-code batch');
  assertRule(messageFor([FEEDBACK]), 'code-fix batch');
});

test('rules refresh carries the preserve-branch-content rule', () => {
  assertRule(rulesRefreshMessage(rulesVersion()), 'rules refresh');
});

test('retry delivery carries the preserve-branch-content rule', () => {
  const message = constrainRetryDispatch({ message: 'old task' }, { headRefOid: HEAD, feedback: [] }).message;
  assertRule(message, 'retry delivery');
});
