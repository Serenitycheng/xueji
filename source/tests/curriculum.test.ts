import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  curricula,
  curriculumStepCount,
  findCurriculumItem,
  curriculumSourceHref,
} from '../lib/curriculum';
import { ensureLearning, applyLearning, copyActionText } from '../lib/learning';
import { freshState, initialState, type StudyState } from '../lib/model';
import { readStoredState } from '../lib/data-protection';
const command = (s: StudyState, op: string, data: Record<string, unknown>) =>
  applyLearning(s, `learning.${op}`, {
    requestId: crypto.randomUUID(),
    ...data,
  }).state;

void test('all six catalogs retain the agreed chapters, lesson IDs and professional nodes', () => {
  assert.deepEqual(
    curricula.map((c) => [c.id, c.units.length, curriculumStepCount(c)]),
    [
      ['professional', 4, 16],
      ['development', 11, 57],
      ['japanese', 28, 111],
      ['photo', 8, 27],
      ['stats', 10, 96],
      ['linear', 6, 44],
    ],
  );
  const nodes = curricula[0].nodes!;
  assert.deepEqual(
    nodes.map((n) => n.id),
    Array.from(
      { length: 31 },
      (_, i) => `PR-${String(i + 1).padStart(2, '0')}`,
    ),
  );
  assert.deepEqual(
    nodes.filter((n) => n.expanded).map((n) => n.id),
    ['PR-05'],
  );
  assert.equal(curricula[0].extensions!.length, 8);
  for (const c of curricula) {
    const steps = c.units.flatMap((u) => u.steps);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
    assert.ok(
      steps.every(
        (s) =>
          s.action &&
          s.done &&
          s.sources.length &&
          s.sources.every((r) => r.locator),
      ),
    );
  }
});

void test('catalog attachment is repeatable, preserves existing direction IDs and every personal state field', () => {
  let old = ensureLearning(initialState());
  old = command(old, 'unit.save', {
    directionId: 'linear',
    name: '课堂第三章',
  });
  old = command(old, 'action.save', {
    directionId: 'linear',
    title: '继续原来的习题',
  });
  old = command(old, 'record.save', {
    directionId: 'linear',
    result: '停在第三题',
    mastery: 'reinforce',
  });
  old = command(old, 'direction.update', {
    directionId: 'linear',
    status: 'paused',
    name: '我的数学',
  });
  delete old.learning!.directions.find((d) => d.id === 'linear')!.curriculumId;
  const before = structuredClone(old);
  const attached = ensureLearning(old);
  const d = attached.learning!.directions.find((d) => d.id === 'linear')!;
  assert.equal(d.curriculumId, 'linear');
  assert.equal(d.name, '我的数学');
  assert.equal(d.status, 'paused');
  assert.equal(
    d.currentUnitId,
    before.learning!.directions.find((d) => d.id === 'linear')!.currentUnitId,
  );
  assert.equal(
    d.currentActionId,
    before.learning!.directions.find((d) => d.id === 'linear')!.currentActionId,
  );
  for (const key of ['units', 'actions', 'records', 'references'] as const)
    assert.deepEqual(attached.learning![key], before.learning![key]);
  assert.deepEqual(old, before);
  assert.equal(ensureLearning(attached), attached);
  assert.equal(attached.learning!.directions.length, 6);
});

void test('selected section persists with its records and repeated selection never resets progress or next action', () => {
  let s = ensureLearning(freshState());
  assert.equal(s.learning!.units.length, 0);
  assert.ok(
    s.learning!.directions.every((d) => !d.currentUnitId && !d.currentActionId),
  );
  const directionId = s.learning!.directions.find(
    (d) => d.curriculumId === 'linear',
  )!.id;
  s = command(s, 'route.select', { directionId, itemId: 'LA-1-1' });
  assert.equal(s.learning!.units[0].contact, 'unseen');
  s = command(s, 'record.save', {
    directionId,
    result: '读到定义，例题还需要提示',
    contact: 'seen',
    mastery: 'reinforce',
    nextMode: 'replace',
    nextTitle: '独立重做第一题',
  });
  const before = JSON.parse(JSON.stringify(s.learning!));
  s = command(s, 'route.select', { directionId, itemId: 'LA-1-2' });
  s = command(s, 'route.select', { directionId, itemId: 'LA-1-1' });
  s = readStoredState(JSON.stringify(s));
  assert.equal(s.learning!.units.length, 2);
  assert.deepEqual(s.learning!.units[0], before.units[0]);
  assert.deepEqual(s.learning!.records, before.records);
  assert.deepEqual(s.learning!.actions, before.actions);
  assert.equal(
    s.learning!.directions.find((d) => d.id === directionId)!.currentUnitId,
    before.units[0].id,
  );
  const text = copyActionText(
    s.learning!,
    s.learning!.directions.find((d) => d.id === directionId)!,
    'https://example.com/',
  );
  assert.match(text, /PDF第9页/);
  assert.match(text, /api\/materials\?id=.*#page=9/);
  assert.match(text, /线性方程与线性方程组/);
});

void test('all nodes can hold a position and cross-direction or unknown route IDs are rejected atomically', () => {
  const s = ensureLearning(freshState());
  const directionId = s.learning!.directions.find(
    (d) => d.curriculumId === 'professional',
  )!.id;
  const before = structuredClone(s);
  assert.throws(
    () => command(s, 'route.select', { directionId, itemId: 'LA-1-1' }),
    /找不到/,
  );
  assert.throws(
    () => command(s, 'route.select', { directionId, itemId: 'PR-99' }),
    /找不到/,
  );
  assert.deepEqual(s, before);
  for (const node of curricula[0].nodes!) {
    const selected = command(s, 'route.select', {
      directionId,
      itemId: node.id,
    });
    assert.equal(selected.learning!.units[0].curriculumItemId, node.id);
  }
});

void test('manual unit reordering still works with selected curriculum lessons between them', () => {
  let s = ensureLearning(freshState());
  const directionId = s.learning!.directions.find(
    (d) => d.curriculumId === 'linear',
  )!.id;
  s = command(s, 'unit.save', { directionId, name: '课堂 A' });
  s = command(s, 'route.select', { directionId, itemId: 'LA-1-1' });
  s = command(s, 'unit.save', { directionId, name: '课堂 B' });
  const unitId = s.learning!.units.at(-1)!.id;
  s = command(s, 'unit.move', { directionId, unitId, delta: 'up' });
  assert.deepEqual(
    s.learning!.units.filter((u) => !u.curriculumItemId).map((u) => u.name),
    ['课堂 B', '课堂 A'],
  );
});

void test('resources keep private attachments private and use verified PDF positions', () => {
  const linear = curricula.find((c) => c.id === 'linear')!;
  const stats = curricula.find((c) => c.id === 'stats')!;
  assert.match(
    curriculumSourceHref(findCurriculumItem(linear, 'LA-1-1')!.sources[0])!,
    /^\/api\/materials\?id=7b9c4a34.*#page=9$/,
  );
  assert.match(
    curriculumSourceHref(findCurriculumItem(stats, 'ST-1-1-1')!.sources[0])!,
    /#page=13$/,
  );
  assert.equal(
    curriculumSourceHref({
      ...linear.units[0].steps[0].sources[1],
      url: 'javascript:alert(1)',
    }),
    undefined,
  );
  assert.ok(!JSON.stringify(curricula).includes('C:/Users/'));
});
