import type { Material, StudyState } from './model';
import {
  withCurricula,
  getCurriculum,
  findCurriculumItem,
  curriculumUnitId,
  currentCurriculumItem,
  curriculumSourceHref,
  resolveCurriculumSource,
  curriculumUnitStates,
} from './curriculum';

export type Mastery = 'unknown' | 'reinforce' | 'independent';
export type Evidence = 'self' | 'practice' | 'work' | 'teacher';
export const stagedCompletionParts = [
  { id: 'self-study', label: '预习／自学' },
  { id: 'class-notes', label: '上课＋补笔记' },
  { id: 'homework', label: '作业' },
  { id: 'qa', label: '答疑' },
] as const;
export type CompletionPart =
  | 'lesson'
  | (typeof stagedCompletionParts)[number]['id'];
export const japaneseAbilityStatuses = [
  { id: 'not-started', label: '未开始' },
  { id: 'learning', label: '学习中' },
  { id: 'basic', label: '基本掌握' },
  { id: 'fluent', label: '熟练' },
] as const;
export type AbilityStatus = (typeof japaneseAbilityStatuses)[number]['id'];
export const abilityStatusLabels: Record<AbilityStatus, string> =
  Object.fromEntries(
    japaneseAbilityStatuses.map((status) => [status.id, status.label]),
  ) as Record<AbilityStatus, string>;
export type Direction = {
  id: string;
  name: string;
  kind: 'course' | 'skill' | 'reading';
  status: 'active' | 'paused' | 'completed' | 'archived';
  goal: string;
  scope: string;
  endCondition: string;
  currentUnitId?: string;
  currentActionId?: string;
  pinned: boolean;
  origin: 'manual' | 'legacy' | 'curriculum';
  curriculumId?: string;
  createdAt: string;
  updatedAt: string;
};
export type Unit = {
  id: string;
  directionId: string;
  name: string;
  scope: string;
  endCondition: string;
  contact: 'unseen' | 'seen';
  mastery: Mastery;
  evidenceType?: Evidence;
  evidence: string;
  blocker: string;
  gap: string;
  archived: boolean;
  origin: 'manual' | 'legacy-route' | 'curriculum';
  curriculumItemId?: string;
  completionParts?: CompletionPart[];
  completedAt?: string;
  abilityStatus?: AbilityStatus;
  updatedAt: string;
};
export type LearningAction = {
  id: string;
  directionId: string;
  unitId?: string;
  title: string;
  start: string;
  endCondition: string;
  source: 'manual' | 'rule';
  basis: string;
  replaces?: string;
  createdAt: string;
};
export type LearningRecord = {
  id: string;
  directionId: string;
  unitId?: string;
  actionId?: string;
  directionName: string;
  unitName: string;
  goal: string;
  result: string;
  mastery?: Mastery;
  contact?: Unit['contact'];
  evidenceType?: Evidence;
  evidence: string;
  blocker?: string;
  nextMode: 'keep' | 'replace' | 'clear';
  nextAction?: LearningAction;
  previousMastery?: Mastery;
  previousContact?: Unit['contact'];
  createdAt: string;
  correctsId?: string;
};
export type Reference = {
  id: string;
  directionId: string;
  unitId?: string;
  name: string;
  kind: 'web' | 'local' | 'location' | 'attachment' | 'note';
  target: string;
  location: string;
  purpose: string;
  primary: boolean;
  updatedAt: string;
};
export type LearningWorkspace = {
  version: 1;
  directions: Direction[];
  units: Unit[];
  actions: LearningAction[];
  records: LearningRecord[];
  references: Reference[];
};
export const masteryLabels: Record<Mastery, string> = {
  unknown: '未判断',
  reinforce: '需要巩固',
  independent: '能够独立完成',
};
export const evidenceLabels: Record<Evidence, string> = {
  self: '用户自评',
  practice: '独立练习的观察',
  work: '作品与反馈',
  teacher: '教师反馈',
};
export function completionPartsFor(
  d: Pick<Direction, 'curriculumId'>,
): CompletionPart[] {
  return d.curriculumId === 'stats' || d.curriculumId === 'linear'
    ? stagedCompletionParts.map((part) => part.id)
    : ['lesson'];
}
export function unitCompletionProgress(
  u: Pick<Unit, 'completionParts'> | undefined,
  d: Pick<Direction, 'curriculumId'>,
) {
  const parts = completionPartsFor(d);
  const saved = new Set(u?.completionParts ?? []);
  const done = parts.filter((part) => saved.has(part)).length;
  return { parts, done, total: parts.length, complete: done === parts.length };
}
export function japaneseAbilityStatusFor(
  value: readonly Unit[] | Unit | undefined,
): AbilityStatus {
  const units = !value ? [] : Array.isArray(value) ? value : [value];
  const explicit = units
    .filter((unit) => unit.abilityStatus)
    .toSorted((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .at(-1)?.abilityStatus;
  if (explicit) return explicit;
  if (
    units.some(
      (unit) => !!unit.completedAt || unit.completionParts?.includes('lesson'),
    )
  )
    return 'basic';
  if (
    units.some((unit) => unit.contact === 'seen' || unit.mastery !== 'unknown')
  )
    return 'learning';
  return 'not-started';
}
export const emptyLearning = (): LearningWorkspace => ({
  version: 1,
  directions: [],
  units: [],
  actions: [],
  records: [],
  references: [],
});

// Only selected legacy routes have confirmed meaning. IDs are stable across reads;
// task completion and quiz scores never become mastery or a current learning unit.
export function ensureLearning(state: StudyState): StudyState {
  if (state.learning) {
    validateLearning(state.learning);
    const learning = withCurricula(state.learning);
    return learning === state.learning ? state : { ...state, learning };
  }
  const learning = emptyLearning();
  for (const s of state.subjects) {
    learning.directions.push({
      id: s.id,
      name: s.name,
      kind: 'course',
      status: s.paused ? 'paused' : 'active',
      goal: s.goal,
      scope: '',
      endCondition: '',
      pinned: false,
      origin: 'legacy',
      createdAt: '',
      updatedAt: '',
    });
    const plan = s.plans.find((p) => p.id === s.selectedPlan);
    plan?.stages.forEach((name, i) =>
      learning.units.push({
        id: `legacy:${s.id}:${plan.id}:${i}`,
        directionId: s.id,
        name,
        scope: '来源于旧记录：' + plan.title,
        endCondition: '',
        contact: 'unseen',
        mastery: 'unknown',
        evidence: '',
        blocker: '',
        gap: '',
        archived: false,
        origin: 'legacy-route',
        updatedAt: '',
      }),
    );
  }
  return { ...state, learning: withCurricula(learning) };
}
export function validateLearning(w: LearningWorkspace) {
  if (
    w.version !== 1 ||
    !['directions', 'units', 'actions', 'records', 'references'].every((k) =>
      Array.isArray(w[k as keyof LearningWorkspace]),
    )
  )
    throw new Error('STUDY_INVALID_LEARNING_DATA');
  for (const rows of [
    w.directions,
    w.units,
    w.actions,
    w.records,
    w.references,
  ])
    if (new Set(rows.map((x) => x.id)).size !== rows.length)
      throw new Error('STUDY_DUPLICATE_LEARNING_ID');
  const validCompletionParts = new Set<string>([
    'lesson',
    ...stagedCompletionParts.map((part) => part.id),
  ]);
  const validAbilityStatuses = new Set(
    japaneseAbilityStatuses.map((status) => status.id),
  );
  for (const u of w.units) {
    if (
      u.completionParts !== undefined &&
      (!Array.isArray(u.completionParts) ||
        new Set(u.completionParts).size !== u.completionParts.length ||
        u.completionParts.some((part) => !validCompletionParts.has(part)))
    )
      throw new Error('STUDY_INVALID_LEARNING_COMPLETION');
    if (
      u.abilityStatus !== undefined &&
      !validAbilityStatuses.has(u.abilityStatus)
    )
      throw new Error('STUDY_INVALID_ABILITY_STATUS');
  }
  const direction = (id: string) => w.directions.some((d) => d.id === id);
  const unit = (id: string | undefined, d: string) =>
    !id || w.units.some((u) => u.id === id && u.directionId === d);
  for (const row of [...w.units, ...w.actions, ...w.records, ...w.references])
    if (
      !direction(row.directionId) ||
      ('unitId' in row && !unit(row.unitId, row.directionId))
    )
      throw new Error('STUDY_INVALID_LEARNING_REFERENCE');
  for (const d of w.directions)
    if (
      !unit(d.currentUnitId, d.id) ||
      (d.currentActionId &&
        !w.actions.some(
          (a) => a.id === d.currentActionId && a.directionId === d.id,
        ))
    )
      throw new Error('STUDY_INVALID_CURRENT_LEARNING');
}
export class LearningError extends Error {}
function str(v: unknown, max = 1000) {
  if (typeof v !== 'string' || v.length > max)
    throw new LearningError(`请填写不超过 ${max} 字的文字。`);
  return v.trim();
}
function choice<T extends string>(v: unknown, values: readonly T[]): T {
  if (typeof v !== 'string' || !values.includes(v as T))
    throw new LearningError('请选择有效的状态。');
  return v as T;
}
const optional = (v: unknown, max = 1000) =>
  v === undefined ? '' : str(v, max);
export function safeReferenceHref(
  r: Pick<Reference, 'kind' | 'target'>,
): string | undefined {
  if (r.kind === 'attachment')
    return '/api/materials?id=' + encodeURIComponent(r.target);
  if (r.kind !== 'web' && r.kind !== 'note') return;
  try {
    const u = new URL(r.target);
    if (['https:', 'http:'].includes(u.protocol) && !u.username && !u.password)
      return u.href;
    // Obsidian open also accepts append/prepend. Only pure navigation is permitted.
    if (
      r.kind === 'note' &&
      u.protocol === 'obsidian:' &&
      u.hostname === 'open' &&
      [...u.searchParams.keys()].every((k) =>
        ['vault', 'file', 'path', 'paneType'].includes(k),
      ) &&
      (u.searchParams.get('path') ||
        (u.searchParams.get('vault') && u.searchParams.get('file')))
    )
      return u.href;
  } catch {}
}
export function obsidianLink(vault: string, file: string) {
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
}
export function learningLink(base: string, id: string) {
  const url = new URL(base);
  url.hash = 'learn/' + encodeURIComponent(id);
  return url.href;
}
export function copyActionText(
  w: LearningWorkspace,
  d: Direction,
  base: string,
  materials: Material[] = [],
) {
  const a = w.actions.find((a) => a.id === d.currentActionId);
  const item = currentCurriculumItem(w, d);
  return [
    d.name + '学习',
    a?.title ?? '下一步尚未确定',
    a?.start ? '开始位置：' + a.start : '',
    a?.endCondition ? '结束条件：' + a.endCondition : '',
    '学习入口：' + learningLink(base, d.id),
    ...(item
      ? [
          '当前路线位置：' + item.name,
          '本节学习指引：' + item.scope,
          ...item.sources
            .map((s) => resolveCurriculumSource(s, materials))
            .map(
              (s) =>
                `${s.label}：${s.locator}${curriculumSourceHref(s) ? ' · ' + new URL(curriculumSourceHref(s)!, base).href : s.fileName ? ' · ' + s.fileName : ''}`,
            ),
        ]
      : []),
    ...w.references
      .filter(
        (r) =>
          r.directionId === d.id && (!r.unitId || r.unitId === d.currentUnitId),
      )
      .map(
        (r) => `${r.name}：${r.target}${r.location ? ' · ' + r.location : ''}`,
      ),
  ]
    .filter(Boolean)
    .join('\n');
}
export function suggestions(w: LearningWorkspace, d: Direction) {
  if (d.status !== 'active' || d.currentActionId) return [];
  const u = w.units.find((u) => u.id === d.currentUnitId);
  if (!u)
    return [
      {
        title: '先写下上次做到哪，再选定这次要学的内容',
        basis: '当前内容尚未确定',
        start: '',
        endCondition: '留下一个明确的起点',
      },
    ];
  if (u.blocker)
    return [
      {
        title: '针对当前卡点先独立尝试，记录卡住的具体步骤',
        basis: '你记录的卡点：' + u.blocker,
        start: u.name,
        endCondition: '说明这次是否仍需要提示',
      },
    ];
  if (u.gap)
    return [
      {
        title: '先检查已标记的前置缺口：' + u.gap,
        basis: '你在当前单元标记了前置缺口',
        start: u.name,
        endCondition: '写下已弄清和尚待确认的部分',
      },
    ];
  return [
    {
      title: '继续当前内容，记录本次停点和仍有疑问的地方',
      basis: '你选择的当前单元：' + u.name,
      start: u.scope || u.name,
      endCondition: '留下下次能继续的位置',
    },
  ];
}

// The route applies this to the loaded profile and commits profile + receipt +
// history together. IDs are derived from the command ID, including retries.
export function applyLearning(
  state: StudyState,
  op: string,
  input: Record<string, unknown>,
  now = new Date().toISOString(),
): { state: StudyState; message: string } {
  const result = structuredClone(ensureLearning(state)),
    w = result.learning!;
  const id = str(input.requestId, 100);
  let message = '已保存到云端';
  const getDirection = () => {
    const d = w.directions.find((d) => d.id === input.directionId);
    if (!d) throw new LearningError('找不到这个学习方向，请重新读取。');
    return d;
  };
  const getUnit = (d: Direction, unitId: unknown) => {
    if (!unitId) return undefined;
    const u = w.units.find((u) => u.id === unitId && u.directionId === d.id);
    if (!u) throw new LearningError('找不到这个方向中的单元。');
    return u;
  };
  const makeAction = (
    d: Direction,
    values: Record<string, unknown>,
    source: 'manual' | 'rule' = 'manual',
  ) => {
    const title = str(values.title, 1000);
    if (!title) throw new LearningError('请写下下一步要做什么。');
    const a: LearningAction = {
      id: 'action:' + id,
      directionId: d.id,
      unitId: d.currentUnitId,
      title,
      start: optional(values.start),
      endCondition: optional(values.endCondition),
      source,
      basis: optional(values.basis),
      replaces: d.currentActionId,
      createdAt: now,
    };
    w.actions.push(a);
    d.currentActionId = a.id;
    return a;
  };
  if (op === 'learning.direction.create') {
    const name = str(input.name, 120);
    if (!name) throw new LearningError('请填写方向名称。');
    w.directions.push({
      id: 'direction:' + id,
      name,
      kind: choice(input.kind ?? 'course', ['course', 'skill', 'reading']),
      status: 'active',
      goal: optional(input.goal),
      scope: '',
      endCondition: '',
      pinned: false,
      origin: 'manual',
      createdAt: now,
      updatedAt: now,
    });
  } else if (op === 'learning.route.select') {
    const d = getDirection();
    const item = findCurriculumItem(
      getCurriculum(d.curriculumId),
      str(input.itemId, 100),
    );
    if (!item)
      throw new LearningError('找不到这个方向中的路线小节，请刷新后重试。');
    const related =
      d.curriculumId === 'japanese'
        ? curriculumUnitStates(w, d, item.id)
        : w.units.filter(
            (unit) =>
              unit.directionId === d.id && unit.curriculumItemId === item.id,
          );
    let u =
      related.find((unit) => unit.id === d.currentUnitId) ??
      related.find((unit) => unit.curriculumItemId === item.id) ??
      related.at(-1);
    if (!u) {
      u = {
        id: curriculumUnitId(d.id, item.id),
        directionId: d.id,
        name: item.name,
        scope: item.scope,
        endCondition: item.endCondition,
        contact: 'unseen',
        mastery: 'unknown',
        evidence: '',
        blocker: '',
        gap: '',
        archived: false,
        origin: 'curriculum',
        curriculumItemId: item.id,
        updatedAt: now,
      };
      w.units.push(u);
    } else {
      u.name = item.name;
      u.scope = item.scope;
      u.endCondition = item.endCondition;
    }
    u.archived = false;
    d.currentUnitId = u.id;
    d.updatedAt = now;
    message = '已保存当前学习位置';
  } else if (op === 'learning.direction.update') {
    const d = getDirection();
    for (const k of ['name', 'goal', 'scope', 'endCondition'] as const)
      if (input[k] !== undefined)
        d[k] = str(input[k], k === 'name' ? 120 : 1000);
    if (!d.name) throw new LearningError('方向名称不能为空。');
    if (input.kind !== undefined)
      d.kind = choice(input.kind, ['course', 'skill', 'reading']);
    if (input.status !== undefined) {
      const status = choice(input.status, [
        'active',
        'paused',
        'completed',
        'archived',
      ]);
      if (status === 'completed' && input.confirm !== true)
        throw new LearningError('请确认这个方向已完成。');
      d.status = status;
    }
    if (input.pinned !== undefined) d.pinned = input.pinned === true;
    if (input.currentUnitId !== undefined) {
      const u = getUnit(d, input.currentUnitId);
      if (u?.archived) throw new LearningError('请先恢复这个单元。');
      d.currentUnitId = u?.id;
    }
    d.updatedAt = now;
  } else if (op === 'learning.direction.move' || op === 'learning.unit.move') {
    const d = getDirection(),
      rows = op === 'learning.direction.move' ? w.directions : w.units;
    const items =
      op === 'learning.direction.move'
        ? w.directions
        : w.units.filter((u) => u.directionId === d.id && !u.curriculumItemId);
    const target = op === 'learning.direction.move' ? d.id : input.unitId,
      index = items.findIndex((x) => x.id === target);
    const delta = choice(input.delta, ['up', 'down']) === 'up' ? -1 : 1,
      next = index + delta;
    if (index < 0 || next < 0 || next >= items.length)
      throw new LearningError('已经到达列表边界。');
    const a = rows.findIndex((x) => x.id === items[index].id),
      b = rows.findIndex((x) => x.id === items[next].id);
    if (op === 'learning.direction.move')
      [w.directions[a], w.directions[b]] = [w.directions[b], w.directions[a]];
    else [w.units[a], w.units[b]] = [w.units[b], w.units[a]];
  } else if (op === 'learning.unit.save') {
    const d = getDirection(),
      existing = getUnit(d, input.unitId);
    const name = str(input.name, 160);
    if (!name) throw new LearningError('请填写当前内容或单元名称。');
    const u: Unit = existing ?? {
      id: 'unit:' + id,
      directionId: d.id,
      name,
      scope: '',
      endCondition: '',
      contact: 'unseen',
      mastery: 'unknown',
      evidence: '',
      blocker: '',
      gap: '',
      archived: false,
      origin: 'manual',
      updatedAt: now,
    };
    u.name = name;
    for (const k of ['scope', 'endCondition', 'gap'] as const)
      if (input[k] !== undefined) u[k] = str(input[k]);
    if (input.archived !== undefined) u.archived = input.archived === true;
    u.updatedAt = now;
    if (!existing) w.units.push(u);
    if (!d.currentUnitId || input.makeCurrent === true) d.currentUnitId = u.id;
    if (u.archived && d.currentUnitId === u.id) d.currentUnitId = undefined;
    d.updatedAt = now;
  } else if (op === 'learning.ability.update') {
    const d = getDirection();
    if (d.curriculumId !== 'japanese')
      throw new LearningError('能力状态仅用于日语能力节点。');
    const item = findCurriculumItem(
      getCurriculum(d.curriculumId),
      str(input.itemId, 100),
    );
    if (!item?.step)
      throw new LearningError('找不到这个日语能力节点，请刷新后重试。');
    const status = choice(
      input.status,
      japaneseAbilityStatuses.map((value) => value.id),
    );
    const related = curriculumUnitStates(w, d, item.id);
    let u =
      related.find((unit) => unit.abilityStatus) ??
      related.find((unit) => unit.curriculumItemId === item.id) ??
      related.at(-1);
    if (!u) {
      u = {
        id: curriculumUnitId(d.id, item.id),
        directionId: d.id,
        name: item.name,
        scope: item.scope,
        endCondition: item.endCondition,
        contact: 'unseen',
        mastery: 'unknown',
        evidence: '',
        blocker: '',
        gap: '',
        archived: false,
        origin: 'curriculum',
        curriculumItemId: item.id,
        updatedAt: now,
      };
      w.units.push(u);
    }
    u.name = item.name;
    u.scope = item.scope;
    u.endCondition = item.endCondition;
    u.abilityStatus = status;
    u.contact = status === 'not-started' ? 'unseen' : 'seen';
    u.mastery =
      status === 'fluent'
        ? 'independent'
        : status === 'basic'
          ? 'reinforce'
          : 'unknown';
    if (input.blocker !== undefined) u.blocker = str(input.blocker);
    if (input.evidence !== undefined) u.evidence = str(input.evidence);
    u.archived = false;
    u.updatedAt = now;
    d.updatedAt = now;
    message = '能力状态已保存';
  } else if (op === 'learning.unit.completion') {
    const d = getDirection(),
      u = getUnit(d, input.unitId ?? d.currentUnitId);
    if (!u) throw new LearningError('请先选择当前学习小节。');
    const allowed = completionPartsFor(d);
    const part = choice(
      input.part ?? (allowed.length === 1 ? 'lesson' : ''),
      allowed,
    );
    if (input.completed !== undefined && typeof input.completed !== 'boolean')
      throw new LearningError('请选择有效的完成状态。');
    const completed = input.completed !== false;
    const saved = new Set(
      (u.completionParts ?? []).filter((value) => allowed.includes(value)),
    );
    if (completed) saved.add(part);
    else saved.delete(part);
    u.completionParts = allowed.filter((value) => saved.has(value));
    u.completedAt =
      u.completionParts.length === allowed.length ? now : undefined;
    if (completed) u.contact = 'seen';
    u.updatedAt = now;
    d.updatedAt = now;
    message = completed
      ? u.completedAt
        ? '本节已完成，掌握判断保持原状'
        : '本节进度已保存，掌握判断保持原状'
      : '已取消这一完成项，掌握判断保持原状';
  } else if (op === 'learning.action.save') {
    const d = getDirection();
    if (input.clear === true) {
      d.currentActionId = undefined;
      message = '下一步已明确留空';
    } else makeAction(d, input, input.source === 'rule' ? 'rule' : 'manual');
    d.updatedAt = now;
  } else if (op === 'learning.record.save') {
    const recordId = 'record:' + str(input.entryId ?? id, 100);
    if (w.records.some((r) => r.id === recordId))
      throw new LearningError(
        '这份学习记录已保存，请关闭表单并查看最近记录。新的学习请另建一条记录。',
      );
    const d = getDirection(),
      u = getUnit(d, input.unitId ?? d.currentUnitId),
      resultText = optional(input.result, 2000),
      mastery =
        input.mastery === undefined || input.mastery === 'keep'
          ? undefined
          : choice(input.mastery, ['unknown', 'reinforce', 'independent']),
      contact =
        input.contact === undefined || input.contact === 'keep'
          ? undefined
          : choice(input.contact, ['seen', 'unseen']);
    const mode = choice(input.nextMode ?? 'keep', ['keep', 'replace', 'clear']);
    const blocker =
        input.blocker === undefined ? undefined : str(input.blocker),
      evidence = optional(input.evidence),
      evidenceType =
        input.evidenceType === undefined || input.evidenceType === ''
          ? mastery !== undefined
            ? 'self'
            : undefined
          : choice(input.evidenceType, ['self', 'practice', 'work', 'teacher']);
    if (
      !resultText &&
      mastery === undefined &&
      contact === undefined &&
      blocker === undefined &&
      !evidence &&
      mode === 'keep'
    )
      throw new LearningError('请至少写下一项实际内容，或明确选择一个状态。');
    if (
      !u &&
      (mastery !== undefined || contact !== undefined || blocker !== undefined)
    )
      throw new LearningError('请先添加当前单元，再为它记录状态或卡点。');
    if (input.correctsId) {
      const last = w.records.filter((r) => r.directionId === d.id).at(-1);
      if (last?.id !== input.correctsId || last.unitId !== u?.id)
        throw new LearningError(
          '已有后续记录或当前单元已变化，请用新的学习记录说明修正。',
        );
    }
    const record: LearningRecord = {
      id: recordId,
      directionId: d.id,
      unitId: u?.id,
      actionId: d.currentActionId,
      directionName: d.name,
      unitName: u?.name ?? '',
      goal: d.goal,
      result: resultText,
      mastery,
      contact,
      evidenceType,
      evidence,
      blocker,
      nextMode: mode,
      previousMastery: u?.mastery,
      previousContact: u?.contact,
      createdAt: now,
      correctsId:
        typeof input.correctsId === 'string' ? input.correctsId : undefined,
    };
    if (u) {
      if (mastery !== undefined) {
        u.mastery = mastery;
        u.evidenceType = evidenceType;
        u.evidence = evidence;
      } else if (evidence) {
        u.evidence = evidence;
        u.evidenceType = evidenceType ?? 'self';
      }
      if (contact !== undefined) u.contact = contact;
      if (blocker !== undefined) u.blocker = blocker;
      u.updatedAt = now;
    }
    if (mode === 'replace')
      record.nextAction = makeAction(d, {
        title: input.nextTitle,
        start: input.nextStart,
        endCondition: input.nextEnd,
        basis: '来自本次学习记录 ' + record.id,
      });
    else if (mode === 'clear') d.currentActionId = undefined;
    else record.nextAction = w.actions.find((a) => a.id === d.currentActionId);
    w.records.push(record);
    d.updatedAt = now;
    message =
      mode === 'keep'
        ? '学习记录已保存；下一步尚未更新，保留原有内容'
        : mode === 'clear'
          ? '学习记录已保存；下一步尚未确定'
          : '学习记录和下一步已一同保存到云端';
  } else if (op === 'learning.reference.save') {
    const d = getDirection(),
      u = getUnit(d, input.unitId),
      name = str(input.name, 200),
      kind = choice(input.kind, [
        'web',
        'local',
        'location',
        'attachment',
        'note',
      ]),
      target = optional(input.target, 2000);
    if (!name) throw new LearningError('请填写材料或笔记名称。');
    if (kind === 'attachment' && !result.materials.some((m) => m.id === target))
      throw new LearningError('这份附件不在当前账号的资料库中。');
    if (kind === 'web' && !safeReferenceHref({ kind, target }))
      throw new LearningError('请填写有效的 http 或 https 网页地址。');
    if (
      kind === 'note' &&
      /^[a-z][a-z0-9+.-]*:/i.test(target) &&
      !safeReferenceHref({ kind, target })
    )
      throw new LearningError(
        '笔记链接仅支持网页或只读的 Obsidian 打开链接；本地文件请选择本地路径。',
      );
    if (!target && kind !== 'location')
      throw new LearningError('请填写可用地址或路径。');
    const existing = w.references.find(
      (r) => r.id === input.referenceId && r.directionId === d.id,
    );
    if (input.referenceId && !existing)
      throw new LearningError('找不到这个引用。');
    const primary = input.primary === true;
    if (primary && kind !== 'note')
      w.references
        .filter(
          (r) =>
            r.directionId === d.id && r.unitId === u?.id && r.kind !== 'note',
        )
        .forEach((r) => (r.primary = false));
    const ref: Reference = {
      id: existing?.id ?? 'reference:' + id,
      directionId: d.id,
      unitId: u?.id,
      name,
      kind,
      target,
      location: optional(input.location),
      purpose: optional(input.purpose),
      primary,
      updatedAt: now,
    };
    if (existing) Object.assign(existing, ref);
    else w.references.push(ref);
  } else throw new LearningError('暂不支持这项学习操作。');
  validateLearning(w);
  return { state: result, message };
}
