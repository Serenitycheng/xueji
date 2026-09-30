import data from './curricula/six-directions.json';
import { extendDevelopmentCurriculum } from './curricula/development-lines';
import type { Direction, LearningWorkspace, Unit } from './learning';
import type { Material } from './model';

export type CurriculumSource = {
  label: string;
  url: string;
  locator: string;
  status: string;
  fileName?: string;
  materialId?: string;
  materialFileNames?: string[];
  pdfPage?: number;
};
export type CurriculumStep = {
  id: string;
  title: string;
  sources: CurriculumSource[];
  action: string;
  done: string;
  optional: boolean;
  group?: string;
  topics?: string[];
  legacyIds?: string[];
  level?: string;
  category?: string;
  course?: string;
  lesson?: string;
  canDos?: string[];
  targets?: string[];
};
export type CurriculumUnit = {
  id: string;
  title: string;
  goal: string;
  prerequisites: string;
  branch: string;
  steps: CurriculumStep[];
};
export type CurriculumNode = {
  id: string;
  title: string;
  branch: string;
  prerequisites: string;
  goal: string;
  materials: string;
  planPage: number;
  expanded: boolean;
};
export type Curriculum = {
  id: string;
  name: string;
  goal: string;
  notes: string[];
  units: CurriculumUnit[];
  nodes?: CurriculumNode[];
  branchPaths?: string[];
  extensions?: string[];
  resourceNote?: string;
};
export const curricula: Curriculum[] = data.subjects.map((curriculum) =>
  curriculum.id === 'development'
    ? extendDevelopmentCurriculum(curriculum)
    : curriculum,
);
export const curriculumVersion = data.version;
export function getCurriculum(id?: string) {
  return curricula.find((c) => c.id === id);
}
export function curriculumStepCount(c: Curriculum) {
  return c.units.reduce((n, u) => n + u.steps.length, 0);
}
export function curriculumSteps(c: Curriculum) {
  return c.units.flatMap((unit) => unit.steps.map((step) => ({ unit, step })));
}
export function findCurriculumItem(c: Curriculum | undefined, id?: string) {
  if (!c || !id) return;
  for (const unit of c.units) {
    const index = unit.steps.findIndex(
      (s) => s.id === id || s.legacyIds?.includes(id),
    );
    if (index >= 0) {
      const step = unit.steps[index];
      return {
        id: step.id,
        name:
          c.id === 'japanese'
            ? `${unit.title} / ${step.title}`
            : `${unit.title} / 第${index + 1}节 · ${step.title}`,
        scope: step.action,
        endCondition: step.done,
        sources: step.sources,
        unit,
        step,
      };
    }
  }
  const node = c.nodes?.find((n) => n.id === id);
  if (node)
    return {
      id: node.id,
      name: `${node.id.slice(3)} · ${node.title}`,
      scope: node.goal,
      endCondition: '',
      sources: [] as CurriculumSource[],
      node,
    };
}

const aliases: Record<string, string[]> = {
  professional: ['专业学习', '专业', '会计金融商学经济学'],
  development: ['开发', '开发学习', 'AI与开发', '编程', '编程学习'],
  japanese: ['日语', '日语学习'],
  photo: ['摄影', '摄影学习'],
  stats: ['概率论与数理统计', '概率论', '概率统计', '概率与统计'],
  linear: ['线性代数', '线代'],
};

// Attach the catalog without guessing progress or replacing personal content.
// Only metadata and missing directions are added; lesson state is created on selection.
export function withCurricula(w: LearningWorkspace): LearningWorkspace {
  let directions = w.directions;
  for (const c of curricula) {
    if (directions.some((d) => d.curriculumId === c.id)) continue;
    const existing = directions.find(
      (d) =>
        !d.curriculumId &&
        (d.id === c.id || aliases[c.id].includes(d.name.trim())),
    );
    if (directions === w.directions) directions = [...directions];
    if (existing) {
      directions[directions.indexOf(existing)] = {
        ...existing,
        curriculumId: c.id,
      };
    } else {
      directions.push({
        id: `curriculum:${c.id}`,
        name: c.name,
        kind: ['development', 'japanese', 'photo'].includes(c.id)
          ? 'skill'
          : 'course',
        status: 'active',
        goal: c.goal,
        scope: '',
        endCondition: '',
        pinned: false,
        origin: 'curriculum',
        curriculumId: c.id,
        createdAt: '',
        updatedAt: '',
      });
    }
  }
  return directions === w.directions ? w : { ...w, directions };
}

export function curriculumUnitId(directionId: string, itemId: string) {
  return `curriculum-unit:${directionId}:${itemId}`;
}
export function currentCurriculumItem(w: LearningWorkspace, d: Direction) {
  const unit = w.units.find((u) => u.id === d.currentUnitId);
  return findCurriculumItem(
    getCurriculum(d.curriculumId),
    unit?.curriculumItemId,
  );
}
// Bind only an unambiguous private upload of the verified edition in this account.
// An explicit attachment ID always wins; never guess a replacement for a missing ID.
export function resolveCurriculumSource(
  source: CurriculumSource,
  materials: Material[],
): CurriculumSource {
  if (source.materialId || !source.materialFileNames?.length) return source;
  const normalize = (name: string) =>
    name.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  const names = new Set(source.materialFileNames.map(normalize));
  const matches = materials.filter(
    (m) => m.kind === 'pdf' && !m.url && names.has(normalize(m.name)),
  );
  return matches.length === 1
    ? { ...source, materialId: matches[0].id }
    : source;
}
export function curriculumSourceHref(source: CurriculumSource) {
  const page = source.pdfPage ? `#page=${source.pdfPage}` : '';
  if (source.materialId)
    return `/api/materials?id=${encodeURIComponent(source.materialId)}${page}`;
  if (source.url === '/api/development-plan') return source.url + page;
  try {
    const url = new URL(source.url);
    if (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {}
}
export function curriculumUnitState(
  w: LearningWorkspace,
  d: Direction,
  itemId: string,
): Unit | undefined {
  if (d.curriculumId !== 'japanese')
    return w.units.find(
      (unit) => unit.directionId === d.id && unit.curriculumItemId === itemId,
    );
  const states = curriculumUnitStates(w, d, itemId);
  return (
    states.find((unit) => unit.id === d.currentUnitId) ??
    states.find((unit) => unit.curriculumItemId === itemId) ??
    states.at(-1)
  );
}
export function curriculumUnitStates(
  w: LearningWorkspace,
  d: Direction,
  itemId: string,
): Unit[] {
  const item = findCurriculumItem(getCurriculum(d.curriculumId), itemId);
  const ids = new Set([item?.id ?? itemId, ...(item?.step?.legacyIds ?? [])]);
  return w.units.filter(
    (unit) =>
      unit.directionId === d.id &&
      !!unit.curriculumItemId &&
      ids.has(unit.curriculumItemId),
  );
}
