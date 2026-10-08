import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshState,
  initialState,
  demoTasks,
  type StudyState,
} from '../lib/model';
import {
  ensureLearning,
  applyLearning,
  suggestions,
  safeReferenceHref,
  obsidianLink,
  copyActionText,
  validateLearning,
  completionPartsFor,
  unitCompletionProgress,
  curriculumCompletionProgress,
  stagedCompletionParts,
} from '../lib/learning';
import { getCurriculum } from '../lib/curriculum';
import { readStoredState } from '../lib/data-protection';
function command(
  s: StudyState,
  op: string,
  data: Record<string, unknown> = {},
) {
  return applyLearning(s, 'learning.' + op, {
    requestId: crypto.randomUUID(),
    ...data,
  }).state;
}
function setup() {
  let s = command(freshState(), 'direction.create', { name: '我的课程' });
  const created = s.learning!.directions.at(-1)!;
  s.learning!.directions = [
    created,
    ...s.learning!.directions.filter((d) => d.id !== created.id),
  ];
  const id = created.id;
  s = command(s, 'unit.save', { directionId: id, name: '一个单元' });
  return { s, id, unitId: s.learning!.units[0].id };
}
test('A01 A02 catalog has no invented progress and manual directions still work without AI or resources', () => {
  const empty = freshState();
  assert.equal(empty.subjects.length, 0);
  assert.equal(
    readStoredState(JSON.stringify(empty)).learning!.directions.length,
    6,
  );
  const { s, id } = setup();
  const saved = command(s, 'action.save', {
    directionId: id,
    title: '从自己的材料中尝试一个例子',
  });
  assert.equal(saved.learning!.units.length, 1);
  assert.equal(
    saved.learning!.directions[0].currentActionId,
    saved.learning!.actions[0].id,
  );
  assert.equal(saved.materials.length, 0);
});
test('A06 A08 A09 contact, unknown and self assessment are independent', () => {
  let { s, id } = setup();
  s = command(s, 'record.save', {
    directionId: id,
    result: '看过这一节，但没有检验',
    contact: 'seen',
  });
  assert.equal(s.learning!.units[0].mastery, 'unknown');
  assert.equal(s.learning!.units[0].contact, 'seen');
  s = command(s, 'record.save', { directionId: id, mastery: 'independent' });
  assert.equal(s.learning!.units[0].evidenceType, 'self');
  assert.equal(s.learning!.records.at(-1)!.previousMastery, 'unknown');
});
void test('every lesson has one independent completion state', () => {
  const setupResult = setup();
  let s = setupResult.s;
  const id = setupResult.id;
  const firstUnitId = setupResult.unitId;
  s = command(s, 'unit.completion', {
    directionId: id,
    unitId: firstUnitId,
    part: 'lesson',
  });
  assert.ok(s.learning!.units[0].completedAt);
  assert.equal(s.learning!.units[0].mastery, 'unknown');
  s = command(s, 'unit.completion', {
    directionId: id,
    unitId: firstUnitId,
    part: 'lesson',
    completed: false,
  });
  assert.equal(s.learning!.units[0].completedAt, undefined);

  assert.equal(s.learning!.units[0].completed, false);
  assert.equal(
    unitCompletionProgress(s.learning!.units[0], s.learning!.directions[0])
      .complete,
    false,
  );
  for (const curriculumId of [
    'linear',
    'stats',
    'japanese',
    'photo',
    'development',
    'professional',
  ])
    assert.deepEqual(completionPartsFor({ curriculumId }), ['lesson']);
});
void test('a curriculum lesson or professional node can be completed without selecting a current lesson', () => {
  for (const curriculumId of [
    'linear',
    'stats',
    'japanese',
    'photo',
    'development',
    'professional',
  ]) {
    const original = ensureLearning(freshState());
    const d = original.learning!.directions.find(
      (d) => d.curriculumId === curriculumId,
    )!;
    const c = getCurriculum(curriculumId)!;
    const itemId = c.nodes?.[0].id ?? c.units[0].steps[0].id;
    const completed = command(original, 'unit.completion', {
      directionId: d.id,
      itemId,
      completed: true,
    });
    const savedDirection = completed.learning!.directions.find(
      (direction) => direction.id === d.id,
    )!;
    assert.equal(savedDirection.currentUnitId, undefined);
    assert.equal(savedDirection.currentActionId, undefined);
    assert.equal(completed.learning!.units.length, 1);
    assert.equal(completed.learning!.units[0].mastery, 'unknown');
    assert.equal(
      curriculumCompletionProgress(completed.learning!, savedDirection, itemId)
        .complete,
      true,
    );
    const repeated = command(completed, 'unit.completion', {
      directionId: d.id,
      itemId,
      completed: true,
    });
    assert.equal(repeated.learning!.units.length, 1);
    assert.equal(
      repeated.learning!.units[0].completedAt,
      completed.learning!.units[0].completedAt,
    );
    const restored = readStoredState(JSON.stringify(repeated));
    assert.equal(
      curriculumCompletionProgress(restored.learning!, savedDirection, itemId)
        .complete,
      true,
    );
    assert.equal(original.learning!.units.length, 0);
  }
});
void test('completing another lesson preserves the current position, next action and learning records', () => {
  let s = ensureLearning(freshState());
  const stats = s.learning!.directions.find(
    (direction) => direction.curriculumId === 'stats',
  )!;
  const step = getCurriculum('stats')!.units[0].steps[0];
  s = command(s, 'route.select', {
    directionId: stats.id,
    itemId: step.id,
  });
  const unitId = s.learning!.directions.find(
    (d) => d.id === stats.id,
  )!.currentUnitId!;
  s = command(s, 'action.save', {
    directionId: stats.id,
    title: '明天继续本节练习',
  });
  s = command(s, 'record.save', {
    directionId: stats.id,
    result: '已看完定义',
  });
  const before = structuredClone(s);
  const other = getCurriculum('stats')!.units[0].steps[1];
  s = command(s, 'unit.completion', {
    directionId: stats.id,
    itemId: other.id,
    completed: true,
  });
  assert.equal(
    s.learning!.directions.find((d) => d.id === stats.id)!.currentUnitId,
    unitId,
  );
  assert.equal(
    s.learning!.directions.find((d) => d.id === stats.id)!.currentActionId,
    before.learning!.directions.find((d) => d.id === stats.id)!.currentActionId,
  );
  assert.deepEqual(s.learning!.records, before.learning!.records);
  assert.deepEqual(s.learning!.actions, before.learning!.actions);
  assert.deepEqual(
    s.learning!.units.find((u) => u.id === unitId),
    before.learning!.units.find((u) => u.id === unitId),
  );
  assert.equal(
    curriculumCompletionProgress(s.learning!, stats, other.id).complete,
    true,
  );
});
void test('legacy four-part math completion is retained but partial work is not promoted', () => {
  let s = ensureLearning(freshState());
  const d = s.learning!.directions.find((d) => d.curriculumId === 'linear')!;
  const itemId = getCurriculum('linear')!.units[0].steps[0].id;
  s = command(s, 'route.select', { directionId: d.id, itemId });
  const unit = s.learning!.units[0];
  const oldParts = stagedCompletionParts.map((part) => part.id);
  unit.completionParts = oldParts.slice(0, 3);
  assert.equal(
    curriculumCompletionProgress(s.learning!, d, itemId).complete,
    false,
  );
  unit.completionParts = [...oldParts];
  assert.equal(
    curriculumCompletionProgress(s.learning!, d, itemId).complete,
    true,
  );
  s = command(s, 'unit.completion', {
    directionId: d.id,
    itemId,
    completed: false,
  });
  assert.equal(
    curriculumCompletionProgress(s.learning!, d, itemId).complete,
    false,
  );
  assert.deepEqual(s.learning!.units[0].completionParts, oldParts);
  const restored = readStoredState(JSON.stringify(s));
  assert.equal(
    curriculumCompletionProgress(restored.learning!, d, itemId).complete,
    false,
  );
});
void test('Japanese completion can be cancelled without deleting ability judgments or changing lesson position', () => {
  let s = ensureLearning(freshState());
  const d = s.learning!.directions.find((d) => d.curriculumId === 'japanese')!;
  const itemId = getCurriculum('japanese')!.units[0].steps[0].id;
  s = command(s, 'ability.update', {
    directionId: d.id,
    itemId,
    status: 'basic',
    evidence: '可以独立回答',
    blocker: '语速较慢',
  });
  const before = structuredClone(s.learning!.units[0]);
  assert.equal(
    curriculumCompletionProgress(s.learning!, d, itemId).complete,
    true,
  );
  s = command(s, 'unit.completion', {
    directionId: d.id,
    itemId,
    completed: false,
  });
  assert.equal(
    curriculumCompletionProgress(s.learning!, d, itemId).complete,
    false,
  );
  for (const key of [
    'abilityStatus',
    'evidence',
    'blocker',
    'mastery',
  ] as const)
    assert.equal(s.learning!.units[0][key], before[key]);
  assert.equal(
    s.learning!.directions.find((direction) => direction.id === d.id)!
      .currentUnitId,
    undefined,
  );
  s = command(s, 'unit.completion', {
    directionId: d.id,
    itemId,
    completed: true,
  });
  assert.equal(
    curriculumCompletionProgress(s.learning!, d, itemId).complete,
    true,
  );
});
void test('invalid or cross-direction completion requests are rejected without changing state', () => {
  const s = ensureLearning(freshState());
  const d = s.learning!.directions.find((d) => d.curriculumId === 'stats')!;
  const itemId = getCurriculum('stats')!.units[0].steps[0].id;
  const before = structuredClone(s);
  for (const invalid of [
    { itemId: 'missing' },
    { itemId: getCurriculum('japanese')!.units[0].steps[0].id },
    { itemId, completed: 'yes' },
    { itemId, part: 'qa' },
    { unitId: 'not-in-this-direction' },
  ]) {
    assert.throws(() =>
      command(s, 'unit.completion', { directionId: d.id, ...invalid }),
    );
    assert.deepEqual(s, before);
  }
  const { s: corrupt } = setup();
  (corrupt.learning!.units[0] as unknown as { completed: string }).completed =
    'yes';
  assert.throws(
    () => validateLearning(corrupt.learning!),
    /STUDY_INVALID_LEARNING_COMPLETION/,
  );
});
test('A10 A11 missing next step preserves confirmed action, explicit clear is distinct', () => {
  let { s, id } = setup();
  s = command(s, 'action.save', { directionId: id, title: '明确的起点' });
  const action = s.learning!.directions[0].currentActionId;
  s = command(s, 'record.save', { directionId: id, result: '今天停在第一步' });
  assert.equal(s.learning!.directions[0].currentActionId, action);
  assert.deepEqual(suggestions(s.learning!, s.learning!.directions[0]), []);
  assert.equal(s.learning!.records.at(-1)!.nextMode, 'keep');
  s = command(s, 'record.save', { directionId: id, nextMode: 'clear' });
  assert.equal(s.learning!.directions[0].currentActionId, undefined);
});
test('A04 next step, status and record persist together and invalid input changes nothing', () => {
  const { s, id } = setup(),
    before = structuredClone(s);
  assert.throws(() =>
    command(s, 'record.save', {
      directionId: id,
      result: '停点',
      mastery: 'reinforce',
      nextMode: 'replace',
      nextTitle: '',
    }),
  );
  assert.deepEqual(s, before);
  const after = command(s, 'record.save', {
    directionId: id,
    result: '需要提示',
    mastery: 'reinforce',
    nextMode: 'replace',
    nextTitle: '先写出判断依据',
  });
  const reloaded = readStoredState(JSON.stringify(after));
  assert.equal(reloaded.learning!.records.length, 1);
  assert.equal(reloaded.learning!.units[0].mastery, 'reinforce');
  assert.equal(reloaded.learning!.actions[0].title, '先写出判断依据');
});
test('A12 pause and restore retain records, references, next step and do not make debt', () => {
  let { s, id } = setup();
  s = command(s, 'action.save', { directionId: id, title: '继续实际材料' });
  s = command(s, 'reference.save', {
    directionId: id,
    kind: 'local',
    name: '练习',
    target: 'D:\\资料\\练习.txt',
  });
  s = command(s, 'record.save', { directionId: id, result: '停在练习中间' });
  const before = structuredClone(s.learning!);
  s = command(s, 'direction.update', { directionId: id, status: 'paused' });
  assert.equal(suggestions(s.learning!, s.learning!.directions[0]).length, 0);
  s = command(s, 'direction.update', { directionId: id, status: 'active' });
  for (const k of ['records', 'references', 'actions', 'units'] as const)
    assert.deepEqual(s.learning![k], before[k]);
  assert.equal(s.tasks.length, 0);
});
test('A13 renames, equal unit names and reordering keep identity and historical context', () => {
  let { s, id, unitId } = setup();
  s = command(s, 'record.save', { directionId: id, result: '第一次尝试' });
  s = command(s, 'unit.save', { directionId: id, name: '一个单元' });
  s = command(s, 'unit.move', { directionId: id, unitId, delta: 'down' });
  s = command(s, 'direction.update', { directionId: id, name: '新的名称' });
  assert.equal(s.learning!.units[1].id, unitId);
  assert.equal(s.learning!.records[0].directionName, '我的课程');
  assert.equal(s.learning!.records[0].unitName, '一个单元');
  assert.equal(s.learning!.directions[0].currentUnitId, unitId);
});
test('A17 exploration can save position and next reading with no mastery label', () => {
  let s = command(freshState(), 'direction.create', {
    name: '阅读一个问题',
    kind: 'reading',
  });
  s = command(s, 'record.save', {
    directionId: s.learning!.directions.at(-1)!.id,
    result: '读到第一篇的讨论',
    nextMode: 'replace',
    nextTitle: '从讨论的问题继续阅读',
  });
  assert.equal(s.learning!.records[0].mastery, undefined);
});
test('A20 empty records are rejected and independent submit IDs do not duplicate one draft', () => {
  const { s, id } = setup();
  assert.throws(() => command(s, 'record.save', { directionId: id }));
  const entryId = crypto.randomUUID();
  const saved = command(s, 'record.save', {
    directionId: id,
    entryId,
    result: '同一条草稿',
  });
  assert.throws(
    () =>
      command(saved, 'record.save', {
        directionId: id,
        entryId,
        result: '同一条草稿',
      }),
    /已保存/,
  );
  assert.equal(
    command(saved, 'record.save', { directionId: id, result: '新的一次学习' })
      .learning!.records.length,
    2,
  );
});
test('A07 A22 A23 migration is idempotent and preserves legacy payload without claiming mastery', () => {
  const old = initialState();
  old.tasks = demoTasks();
  old.tasks[0].status = 'done';
  old.tasks[0].score = 100;
  old.subjects[0].plans = [
    {
      id: 'chosen',
      title: '原路线',
      description: '',
      resources: [],
      stages: ['章节甲', '章节乙'],
    },
  ];
  old.subjects[0].selectedPlan = 'chosen';
  const before = structuredClone(old);
  const migrated = ensureLearning(old);
  assert.deepEqual(old, before);
  const { learning, ...legacy } = migrated;
  assert.deepEqual(legacy, before);
  assert.equal(learning!.units.length, 2);
  assert.ok(
    learning!.units.every(
      (u) => u.mastery === 'unknown' && u.contact === 'unseen',
    ),
  );
  assert.ok(
    learning!.directions.every((d) => !d.currentUnitId && !d.currentActionId),
  );
  assert.deepEqual(ensureLearning(migrated), migrated);
});
test('A15 A16 note URI correctly encodes unicode and rejects writing actions and unsafe URLs', () => {
  const uri = obsidianLink('学习 库', '数学/问题 #一 & 二');
  assert.equal(new URL(uri).searchParams.get('file'), '数学/问题 #一 & 二');
  assert.ok(safeReferenceHref({ kind: 'note', target: uri }));
  for (const target of [
    'javascript:alert(1)',
    'data:text/html,hi',
    'obsidian://new?vault=x&file=a',
    'obsidian://open?vault=x&file=a&append=overwrite',
  ])
    assert.equal(safeReferenceHref({ kind: 'note', target }), undefined);
  const { s, id } = setup();
  const text = copyActionText(
    s.learning!,
    s.learning!.directions[0],
    'https://example.com/#today',
  );
  assert.ok(text.includes('#learn/' + encodeURIComponent(id)));
  assert.ok(!text.includes('已创建'));
});
test('A26 references cannot attach another direction unit or an unknown attachment', () => {
  const { s, id } = setup();
  assert.throws(() =>
    command(s, 'reference.save', {
      directionId: id,
      unitId: 'foreign',
      name: '引用',
      kind: 'web',
      target: 'https://example.com',
    }),
  );
  assert.throws(() =>
    command(s, 'reference.save', {
      directionId: id,
      name: '引用',
      kind: 'attachment',
      target: 'foreign',
    }),
  );
  const bad = structuredClone(s.learning!);
  bad.directions[0].currentActionId = 'foreign';
  assert.throws(() => validateLearning(bad));
});
test('current blocker can be explicitly cleared while its history remains', () => {
  let { s, id } = setup();
  s = command(s, 'record.save', {
    directionId: id,
    blocker: '仍需要提示',
    result: '第一次',
  });
  assert.match(
    suggestions(s.learning!, s.learning!.directions[0])[0].basis,
    /仍需要提示/,
  );
  s = command(s, 'record.save', {
    directionId: id,
    blocker: '',
    result: '已弄清',
  });
  assert.equal(s.learning!.units[0].blocker, '');
  assert.equal(s.learning!.records[0].blocker, '仍需要提示');
});
test('latest correction keeps original record and coherently updates current judgment', () => {
  let { s, id } = setup();
  s = command(s, 'record.save', {
    directionId: id,
    result: '误记',
    mastery: 'independent',
  });
  const record = s.learning!.records[0];
  s = command(s, 'record.save', {
    directionId: id,
    correctsId: record.id,
    result: '其实需要提示',
    mastery: 'reinforce',
  });
  assert.equal(s.learning!.records[0].result, '误记');
  assert.equal(s.learning!.units[0].mastery, 'reinforce');
  assert.throws(() =>
    command(s, 'record.save', {
      directionId: id,
      correctsId: record.id,
      result: '过时的修正',
    }),
  );
});
