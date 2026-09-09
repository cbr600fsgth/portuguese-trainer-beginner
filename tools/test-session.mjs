// session.js の検証。node tools/test-session.mjs で実行する。
//
// 確認したいのは2点だけ。
//   1. 1回のセッションで全フレーズが必ず1回ずつ出る（欠落・重複なし）
//   2. 出題が日付に依存しない（buildSession は日付を引数に取らない）

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as session from '../js/session.js';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}`);
    console.error(`       ${e.message}`);
    process.exitCode = 1;
  }
}

const phrases = JSON.parse(
  readFileSync(new URL('../data/phrases.json', import.meta.url))
).phrases;

console.log('\n日付ユーティリティ（連続日数の判定にのみ使う）');

check('addDays が月をまたぐ', () => {
  assert.equal(session.addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(session.addDays('2026-10-01', -1), '2026-09-30');
  assert.equal(session.addDays('2026-09-09', 7), '2026-09-16');
});

check('addDays が年をまたぐ', () => {
  assert.equal(session.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(session.addDays('2027-01-01', -1), '2026-12-31');
});

check('addDays が閏日を数える', () => {
  assert.equal(session.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(session.addDays('2028-02-29', 1), '2028-03-01');
});

check('diffDays が日数を返す', () => {
  assert.equal(session.diffDays('2026-09-09', '2026-09-16'), 7);
  assert.equal(session.diffDays('2026-09-16', '2026-09-09'), -7);
  assert.equal(session.diffDays('2026-09-09', '2026-09-09'), 0);
});

check('dayNum と fromDayNum が往復する', () => {
  ['2026-09-09', '2026-01-01', '2026-12-31', '2028-02-29'].forEach((iso) => {
    assert.equal(session.fromDayNum(session.dayNum(iso)), iso);
  });
});

check('isoFromDate がローカル暦日を返す', () => {
  assert.equal(session.isoFromDate(new Date(2026, 8, 9)), '2026-09-09');
  assert.equal(session.isoFromDate(new Date(2026, 0, 1)), '2026-01-01');
});

console.log('\nシャッフル');

check('元の配列を変更しない', () => {
  const src = ['a', 'b', 'c', 'd'];
  const copy = [...src];
  session.shuffle(src);
  assert.deepEqual(src, copy);
});

check('要素が増減しない', () => {
  const src = ['a', 'b', 'c', 'd', 'e'];
  for (let i = 0; i < 50; i++) {
    const out = session.shuffle(src);
    assert.equal(out.length, src.length);
    assert.deepEqual([...out].sort(), [...src].sort());
  }
});

check('毎回同じ順序にはならない', () => {
  const src = phrases.map((p) => p.id);
  const seen = new Set();
  for (let i = 0; i < 50; i++) seen.add(session.shuffle(src).join(','));
  // 10要素なら並びは10!通り。50回すべて同一になる確率は事実上ゼロ
  assert.ok(seen.size > 1, `50回すべて同じ順序だった: ${[...seen][0]}`);
});

console.log('\nセッションの組み立て');

check(`全 ${phrases.length} フレーズが1回ずつ出る`, () => {
  const ids = session.buildSession(phrases);
  assert.equal(ids.length, phrases.length);
  assert.equal(new Set(ids).size, phrases.length, '重複がある');
  const missing = phrases.filter((p) => !ids.includes(p.id)).map((p) => p.id);
  assert.deepEqual(missing, [], `未出題: ${missing.join(', ')}`);
});

check('何回繰り返しても全フレーズが揃う', () => {
  for (let i = 0; i < 100; i++) {
    const ids = session.buildSession(phrases);
    assert.equal(new Set(ids).size, phrases.length, `${i + 1}回目で欠落した`);
  }
});

check('buildSession は日付を引数に取らない（出題が日付で変わらない）', () => {
  assert.equal(session.buildSession.length, 1);
  // 余分な引数を渡しても件数は変わらない
  const a = session.buildSession(phrases, '2026-09-09');
  const b = session.buildSession(phrases, '2030-01-01');
  assert.equal(a.length, phrases.length);
  assert.equal(b.length, phrases.length);
});

check('フレーズが空なら空のキューを返す', () => {
  assert.deepEqual(session.buildSession([]), []);
});

console.log(`\n${passed} 件成功${process.exitCode ? '、失敗あり' : ''}`);
