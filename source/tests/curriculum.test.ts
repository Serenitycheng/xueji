import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  curricula,
  curriculumStepCount,
  findCurriculumItem,
  curriculumSourceHref,
  resolveCurriculumSource,
  currentCurriculumItem,
  curriculumUnitId,
  curriculumUnitState,
  curriculumUnitStates,
} from '../lib/curriculum';
import {
  ensureLearning,
  applyLearning,
  copyActionText,
  japaneseAbilityStatusFor,
} from '../lib/learning';
import {
  freshState,
  initialState,
  type StudyState,
  type Material,
} from '../lib/model';
import { readStoredState } from '../lib/data-protection';
import { CATALOG } from '../lib/catalog';
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
      ['stats', 10, 37],
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

void test('development systematically reviews Python in one project without replacing existing node IDs', () => {
  const development = curricula.find(
    (curriculum) => curriculum.id === 'development',
  )!;
  const python = development.units.find((unit) => unit.id === 'DEV-U01')!;
  assert.equal(python.title, '01｜Python系统复习与项目实践');
  assert.match(python.goal, /系统复习.*本地学习资料索引器/);
  assert.deepEqual(
    python.steps.map((step) => step.id),
    Array.from(
      { length: 9 },
      (_, index) => `DEV-01-${String(index + 1).padStart(2, '0')}`,
    ),
  );
  assert.match(
    development.notes[0],
    /GPT生成提纲.*看教材.*自己回答.*做项目.*GPT复盘/,
  );
  assert.match(python.steps[0].action, /资料索引器.*顶层文件/);
  assert.match(python.steps[0].done, /正常目录、空目录和不存在目录/);
  assert.ok(
    python.steps.every(
      (step) =>
        step.sources[0].label === '嵩天等《Python语言程序设计基础》第3版' &&
        /系统复习主线/.test(step.sources[0].status),
    ),
  );
  assert.ok(python.steps.every((step) => step.sources.length <= 3));
  assert.ok(
    python.steps.every((step) =>
      step.sources.every(
        (source) =>
          source.url !== '/api/development-plan' &&
          source.url !== 'https://www.icourse163.org/course/BIT-268001',
      ),
    ),
  );
  assert.equal(development.units[1].id, 'DEV-U02');
});

void test('Japanese route uses durable ability nodes while retaining IRODORI order and source mappings', () => {
  const japanese = curricula.find(
    (curriculum) => curriculum.id === 'japanese',
  )!;
  const steps = japanese.units.flatMap((unit) => unit.steps);
  assert.equal(steps.length, 111);
  assert.ok(steps.every((step) => !/^第\d+课/.test(step.title)));
  assert.deepEqual(
    japanese.units.slice(0, 4).map((unit) => unit.title),
    ['A1 · 文字与发音', 'A1 · 基础沟通', 'A1 · 自我与人物', 'A1 · 饮食与点餐'],
  );
  const introduction = findCurriculumItem(japanese, 'JP-A1-L03-01')!;
  assert.equal(introduction.step!.title, '能进行基础自我介绍并询问他人信息');
  assert.equal(introduction.step!.course, 'IRODORI Starter A1');
  assert.equal(introduction.step!.lesson, 'Lesson 3');
  assert.deepEqual(introduction.step!.canDos, ['08', '10']);
  assert.ok(
    introduction.sources.every((source) => /Lesson 3/.test(source.locator)),
  );
  const personalDetails = findCurriculumItem(japanese, 'JP-A1-L03-02')!;
  assert.equal(personalDetails.step!.title, '能填写名卡和基础个人资料');
  assert.deepEqual(personalDetails.step!.canDos, ['09', '11']);
  assert.notEqual(personalDetails.id, introduction.id);
  assert.equal(steps.at(-1)!.lesson, 'Lesson 18');
  assert.equal(steps.at(-1)!.course, 'IRODORI 初级2 A2');
});

void test('Japanese abilities open the matching official IRODORI online lesson first', () => {
  const japanese = curricula.find(
    (curriculum) => curriculum.id === 'japanese',
  )!;
  const courseSlugs: Record<string, string> = {
    'IRODORI Starter A1': 'a1',
    'IRODORI 初级1 A2': 'a2-1',
    'IRODORI 初级2 A2': 'a2-2',
  };
  for (const step of japanese.units.flatMap((unit) => unit.steps)) {
    const primary = step.sources[0];
    assert.equal(primary.label, 'IRODORI 在线课程');
    const url = new URL(primary.url);
    assert.equal(url.origin, 'https://www.irodori-online.jpf.go.jp');
    if (step.id.startsWith('JP-00-')) {
      assert.equal(url.pathname, '/a1/introduction/01-001-01-01/');
      continue;
    }
    const lesson = Number(step.lesson!.replace('Lesson ', ''));
    const canDo = Number(step.canDos![0]);
    assert.match(
      url.pathname,
      new RegExp(
        `^/${courseSlugs[step.course!]}/learning/${String(lesson).padStart(2, '0')}-${String(canDo).padStart(3, '0')}-\\d{2}-\\d{2}/$`,
      ),
    );
  }
});

void test('Japanese legacy lesson progress initializes ability conservatively and remains editable', () => {
  let state = ensureLearning(freshState());
  const direction = state.learning!.directions.find(
    (value) => value.curriculumId === 'japanese',
  )!;
  state = command(state, 'route.select', {
    directionId: direction.id,
    itemId: 'JP-A1-L03-02',
  });
  const oldUnit = state.learning!.units.at(-1)!;
  oldUnit.name = '第3课·自我介绍与个人资料｜读写与应用';
  oldUnit.contact = 'seen';
  oldUnit.completionParts = ['lesson'];
  oldUnit.completedAt = '2026-09-01T00:00:00.000Z';
  const currentDirection = state.learning!.directions.find(
    (value) => value.id === direction.id,
  )!;
  currentDirection.currentUnitId = oldUnit.id;

  const related = curriculumUnitStates(
    state.learning!,
    currentDirection,
    'JP-A1-L03-02',
  );
  assert.deepEqual(related, [oldUnit]);
  assert.equal(japaneseAbilityStatusFor(related), 'basic');
  assert.equal(
    japaneseAbilityStatusFor(
      curriculumUnitStates(state.learning!, currentDirection, 'JP-A1-L03-01'),
    ),
    'not-started',
  );

  const beforeCount = state.learning!.units.length;
  state = command(state, 'route.select', {
    directionId: direction.id,
    itemId: 'JP-A1-L03-02',
  });
  assert.equal(state.learning!.units.length, beforeCount);
  assert.equal(
    state.learning!.directions.find((value) => value.id === direction.id)!
      .currentUnitId,
    oldUnit.id,
  );
  assert.equal(
    state.learning!.units.at(-1)!.name,
    'A1 · 自我与人物 / 能填写名卡和基础个人资料',
  );

  state = command(state, 'ability.update', {
    directionId: direction.id,
    itemId: 'JP-A1-L03-02',
    status: 'learning',
    blocker: '听力反应慢',
    evidence: '能完成姓名和籍贯介绍',
  });
  const updated = state.learning!.units.at(-1)!;
  assert.equal(updated.abilityStatus, 'learning');
  assert.equal(updated.blocker, '听力反应慢');
  assert.equal(updated.evidence, '能完成姓名和籍贯介绍');
  assert.equal(updated.completedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(japaneseAbilityStatusFor(updated), 'learning');
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

void test('probability uses section-level entries and preserves topic search, PDF starts and partial electives', () => {
  const stats = curricula.find((c) => c.id === 'stats')!;
  const steps = stats.units.flatMap((u) => u.steps);
  assert.ok(
    steps.every(
      (s) => /^ST-\d+-\d+$/.test(s.id) && /^§\d+\.\d+ /.test(s.title),
    ),
  );
  assert.equal(steps.flatMap((s) => s.legacyIds ?? [s.id]).length, 96);
  assert.deepEqual(
    steps.filter((s) => s.optional).map((s) => s.id),
    ['ST-4-4', 'ST-8-4', 'ST-8-6'],
  );
  const section = findCurriculumItem(stats, 'ST-1-5')!;
  assert.equal(
    section.name,
    '第1单元｜随机事件与概率 / 第5节 · §1.5 全概率公式和贝叶斯公式',
  );
  assert.equal(section.sources[0].pdfPage, 69);
  assert.equal(section.sources[0].locator, '§1.5；PDF第69页起，读至本章习题前');
  assert.ok(
    findCurriculumItem(stats, 'ST-7-1')!.step!.topics!.includes('最大似然估计'),
  );
  assert.match(findCurriculumItem(stats, 'ST-6-1')!.scope, /选学/);
  assert.match(findCurriculumItem(stats, 'ST-7-3')!.scope, /选学/);
  assert.equal(findCurriculumItem(stats, 'ST-1-5-99'), undefined);
  assert.equal(
    findCurriculumItem(
      curricula.find((c) => c.id === 'linear'),
      'ST-1-5-1',
    ),
    undefined,
  );
});

void test('legacy probability positions resolve without rewriting history or promoting subsection mastery', () => {
  let s = ensureLearning(freshState());
  const directionId = s.learning!.directions.find(
    (d) => d.curriculumId === 'stats',
  )!.id;
  // Recreate an older saved workspace with progress and records in both finer subsections.
  for (const itemId of ['ST-1-5-1', 'ST-1-5-2']) {
    s = command(s, 'route.select', { directionId, itemId: 'ST-1-5' });
    const d = s.learning!.directions.find((d) => d.id === directionId)!;
    const unit = s.learning!.units.find((u) => u.id === d.currentUnitId)!;
    unit.id = curriculumUnitId(directionId, itemId);
    unit.curriculumItemId = itemId;
    unit.name =
      itemId === 'ST-1-5-1' ? '§1.5.1 全概率公式' : '§1.5.2 贝叶斯公式';
    d.currentUnitId = unit.id;
    s = command(s, 'record.save', {
      directionId,
      result: '旧小节的学习记录',
      contact: 'seen',
      mastery: 'independent',
      nextMode: 'replace',
      nextTitle: '继续旧小节练习',
    });
  }
  const before = JSON.parse(JSON.stringify(s.learning!));
  s = readStoredState(JSON.stringify(s));
  assert.deepEqual(s.learning, before);
  const d = s.learning!.directions.find((d) => d.id === directionId)!;
  assert.equal(currentCurriculumItem(s.learning!, d)!.id, 'ST-1-5');
  assert.equal(curriculumUnitState(s.learning!, d, 'ST-1-5'), undefined);
  s = command(s, 'route.select', { directionId, itemId: 'ST-1-5' });
  const whole = curriculumUnitState(s.learning!, d, 'ST-1-5')!;
  assert.equal(whole.mastery, 'unknown');
  assert.equal(whole.contact, 'unseen');
  assert.deepEqual(s.learning!.units.slice(0, 2), before.units);
  for (const key of ['records', 'actions', 'references'] as const)
    assert.deepEqual(s.learning![key], before[key]);
  assert.equal(
    s.learning!.directions.find((d) => d.id === directionId)!.currentActionId,
    d.currentActionId,
  );
  s = command(s, 'record.save', {
    directionId,
    result: '整节练习',
    contact: 'seen',
    mastery: 'reinforce',
  });
  const afterRecord = structuredClone(s.learning!);
  s = command(s, 'route.select', { directionId, itemId: 'ST-1-5-1' });
  s = command(s, 'route.select', { directionId, itemId: 'ST-1-5-2' });
  assert.equal(s.learning!.units.length, 3);
  assert.deepEqual(s.learning!.units, afterRecord.units);
  assert.deepEqual(s.learning!.records, afterRecord.records);
  assert.equal(
    s.learning!.directions.find((d) => d.id === directionId)!.currentUnitId,
    whole.id,
  );
});

void test('existing probability entries already at section level keep their saved progress', () => {
  let s = ensureLearning(freshState());
  const directionId = s.learning!.directions.find(
    (d) => d.curriculumId === 'stats',
  )!.id;
  s = command(s, 'route.select', { directionId, itemId: 'ST-2-1' });
  s = command(s, 'record.save', {
    directionId,
    result: '已掌握随机变量',
    mastery: 'independent',
    contact: 'seen',
  });
  const before = structuredClone(s.learning!);
  s = command(s, 'route.select', { directionId, itemId: 'ST-1-5' });
  s = command(s, 'route.select', { directionId, itemId: 'ST-2-1' });
  assert.deepEqual(s.learning!.units[0], before.units[0]);
  assert.deepEqual(s.learning!.records, before.records);
});

void test('Python textbook binds only an unambiguous private upload of the verified edition', () => {
  const source = getPythonSource();
  const uploaded: Material = {
    id: 'python-upload',
    subjectId: 'development',
    kind: 'pdf',
    name: source.materialFileNames![0],
    size: 134631499,
    pages: 416,
    textLength: 0,
    status: 'needs-text',
    excerpt: '',
    createdAt: '',
  };
  assert.equal(resolveCurriculumSource(source, []), source);
  assert.equal(curriculumSourceHref(source), undefined);
  const resolved = resolveCurriculumSource(source, [uploaded]);
  assert.equal(resolved.materialId, uploaded.id);
  assert.equal(
    curriculumSourceHref(resolved),
    '/api/materials?id=python-upload#page=68',
  );
  assert.equal(source.materialId, undefined);
  assert.equal(
    resolveCurriculumSource(source, [
      { ...uploaded, name: 'Python语言程序设计基础（第3版）.PDF' },
    ]).materialId,
    uploaded.id,
  );
  for (const other of [
    { ...uploaded, name: 'Python语言程序设计基础 第二版.pdf' },
    { ...uploaded, kind: 'link' as const },
    { ...uploaded, url: 'https://example.com/book.pdf' },
  ])
    assert.equal(resolveCurriculumSource(source, [other]), source);
  assert.equal(
    resolveCurriculumSource(source, [
      uploaded,
      { ...uploaded, id: 'duplicate' },
    ]),
    source,
  );
  const explicit = { ...source, materialId: 'explicit-id' };
  assert.equal(resolveCurriculumSource(explicit, [uploaded]), explicit);
});
function getPythonSource() {
  return findCurriculumItem(
    curricula.find((c) => c.id === 'development'),
    'DEV-01-01',
  )!.sources[0];
}
void test('copied learning action includes the account-specific Python attachment without a public file URL', () => {
  let s = ensureLearning(freshState());
  const directionId = s.learning!.directions.find(
    (d) => d.curriculumId === 'development',
  )!.id;
  s = command(s, 'route.select', { directionId, itemId: 'DEV-01-01' });
  const d = s.learning!.directions.find((d) => d.id === directionId)!;
  const source = getPythonSource();
  const materials: Material[] = [
    {
      id: 'private-python',
      subjectId: 'development',
      kind: 'pdf',
      name: source.materialFileNames![0],
      size: 10,
      textLength: 0,
      status: 'needs-text',
      excerpt: '',
      createdAt: '',
    },
  ];
  assert.match(
    copyActionText(s.learning!, d, 'https://study.example/', materials),
    /https:\/\/study\.example\/api\/materials\?id=private-python#page=68/,
  );
  assert.ok(
    !copyActionText(s.learning!, d, 'https://study.example/').includes(
      'id=private-python',
    ),
  );
});

void test('current recommendations agree with the route while legacy resource identities stay resolvable', () => {
  const recommended = CATALOG.filter((r) => r.recommended !== false);
  assert.deepEqual(
    recommended.filter((r) => r.subjectId === 'linear').map((r) => r.url),
    ['https://www.icourse163.org/course/BIT-32001'],
  );
  assert.ok(
    recommended.some(
      (r) =>
        r.subjectId === 'stats' &&
        r.url === 'https://www.bilibili.com/video/BV1JXppejE8q/',
    ),
  );
  assert.equal(
    recommended.filter(
      (r) => r.subjectId === 'photo' && r.url.includes('bilibili.com'),
    ).length,
    5,
  );
  assert.ok(
    recommended.some(
      (r) =>
        r.subjectId === 'development' &&
        r.url === 'https://docs.python.org/zh-cn/3/tutorial/',
    ),
  );
  assert.ok(
    recommended.some(
      (r) =>
        r.subjectId === 'development' &&
        r.url === 'https://www.bilibili.com/video/BV113ixBqEcS/',
    ),
  );
  for (const id of [
    'cs50-python',
    'mit-linear',
    'mit-stats',
    '3b1b',
    'stat110',
    'bit-python',
  ]) {
    assert.ok(CATALOG.find((r) => r.id === id)?.url);
    assert.ok(!recommended.some((r) => r.id === id));
  }
});
