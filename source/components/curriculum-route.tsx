'use client';
import { useId, useState } from 'react';
import { BookOpen, ArrowUpRight, Check, Map } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PdfOpenButton } from './pdf-open-button';
import { JapaneseAbilityEditor } from './japanese-abilities';
import type { Actions } from './study-app';
import type { StudyState } from '@/lib/model';
import {
  abilityStatusLabels,
  japaneseAbilityStatusFor,
  masteryLabels,
  unitCompletionProgress,
  type Direction,
} from '@/lib/learning';
import {
  getCurriculum,
  curriculumStepCount,
  curriculumSourceHref,
  resolveCurriculumSource,
  curriculumUnitState,
  curriculumUnitStates,
  currentCurriculumItem,
  type Curriculum,
  type CurriculumSource,
  type CurriculumStep,
  type CurriculumUnit,
} from '@/lib/curriculum';

type Props = {
  state: StudyState;
  d: Direction;
  actions: Actions;
  onRecord: () => void;
};

function Sources({
  sources,
  state,
}: {
  sources: CurriculumSource[];
  state: StudyState;
}) {
  return (
    <ul className="curriculum-sources">
      {sources.map((source, i) => {
        const s = resolveCurriculumSource(source, state.materials);
        const href = curriculumSourceHref(s);
        const missing = s.materialId
          ? !state.materials.some((m) => m.id === s.materialId)
          : !!s.materialFileNames?.length;
        return (
          <li key={`${s.label}:${i}`}>
            <div>
              <strong>{s.label}</strong>
              <p className="source-location">{s.locator}</p>
              <small>{s.status}</small>
              {s.fileName && <p className="hint">原方案：{s.fileName}</p>}
              {missing && (
                <p className="hint">
                  {s.materialFileNames ? (
                    <>
                      请在资料库导入这份第3版 PDF，保留原文件名，或命名为
                      “Python语言程序设计基础
                      第三版.pdf”。同名文件需只保留一份， 即可按上面的页码打开。{' '}
                      <a href="#materials">前往资料库</a>
                    </>
                  ) : (
                    '资料库暂未找到这本教材，请补充原件；仍可按上面的章节和页序学习。'
                  )}
                </p>
              )}
            </div>
            {href &&
              !missing &&
              (s.materialId || s.url === '/api/development-plan' ? (
                <PdfOpenButton
                  resource={
                    s.materialId
                      ? { kind: 'material', materialId: s.materialId }
                      : { kind: 'development-plan' }
                  }
                  title={s.label}
                  page={s.pdfPage}
                  className="text-link resource-open"
                  label={
                    s.materialId
                      ? '打开教材' +
                        (s.pdfPage ? ' · PDF第' + s.pdfPage + '页' : '')
                      : '打开方案原件'
                  }
                />
              ) : (
                <a
                  className="text-link resource-open"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={16} />
                  {s.materialId
                    ? `打开教材 · PDF第${s.pdfPage}页`
                    : s.url.startsWith('/api/')
                      ? '打开方案原件'
                      : '打开资源'}
                </a>
              ))}
          </li>
        );
      })}
    </ul>
  );
}

export function CurrentCurriculumLesson({
  state,
  d,
}: Pick<Props, 'state' | 'd'>) {
  const item = currentCurriculumItem(state.learning!, d);
  if (!item) return null;
  return (
    <div className="current-lesson-guide">
      <div className="lesson-guide-grid">
        <section className="lesson-guide-card">
          <span className="lesson-guide-label">本节任务</span>
          <p>{item.scope}</p>
        </section>
        {item.endCondition && (
          <section className="lesson-guide-card is-goal">
            <span className="lesson-guide-label">完成标准</span>
            <p>{item.endCondition}</p>
          </section>
        )}
      </div>
      {item.node && (
        <p className="hint">
          这个节点暂未拆分课节。原方案教材：{item.node.materials}
          。可先在这里记录学习位置。
        </p>
      )}
      <section className="lesson-resource-section">
        <h4 className="lesson-subheading">学习资料</h4>
        <Sources sources={item.sources} state={state} />
      </section>
    </div>
  );
}

function Step({
  step,
  index,
  state,
  d,
  actions,
  onRecord,
}: Props & { step: CurriculumStep; index: number }) {
  const w = state.learning!;
  const relatedUnits = curriculumUnitStates(w, d, step.id);
  const saved = curriculumUnitState(w, d, step.id);
  const current = currentCurriculumItem(w, d)?.id === step.id;
  const currentSaved = !!saved && saved.id === d.currentUnitId;
  const completion = unitCompletionProgress(saved, d);
  const japanese = d.curriculumId === 'japanese';
  const abilityStatus = japaneseAbilityStatusFor(relatedUnits);
  const legacyUnits = relatedUnits.filter(
    (unit) => unit.curriculumItemId !== step.id,
  );
  const unitIds = new Set([
    ...(saved ? [saved.id] : []),
    ...legacyUnits.map((u) => u.id),
  ]);
  const count = w.records.filter(
    (r) => r.unitId && unitIds.has(r.unitId),
  ).length;
  const select = async (record = false) => {
    if (currentSaved) {
      if (record) onRecord();
      return;
    }
    const result = await actions.run('learning.route.select', {
      directionId: d.id,
      itemId: step.id,
    });
    if (result && record) onRecord();
  };
  return (
    <details
      className={`curriculum-step ${current ? 'is-current' : ''} ${!japanese && completion.complete ? 'is-complete' : ''}`}
      data-step-id={step.id}
      open={current || undefined}
    >
      <summary>
        <span className="step-number">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="step-title">
          {step.title}
          <small>
            {step.optional ? '选学 · ' : ''}
            {japanese && step.lesson ? `${step.lesson} · ` : ''}
            {current ? '当前学习 · ' : ''}
            {japanese ? (
              abilityStatusLabels[abilityStatus]
            ) : (
              <>
                {completion.complete
                  ? '已完成 · '
                  : completion.done > 0
                    ? `已完成 ${completion.done}/${completion.total} · `
                    : saved?.contact === 'seen'
                      ? '已接触 · '
                      : ''}
                {saved
                  ? masteryLabels[saved.mastery]
                  : legacyUnits.length
                    ? '整节未判断'
                    : '尚未记录'}
              </>
            )}
            {count > 0 ? ` · ${count} 条记录` : ''}
          </small>
        </span>
        {(current || (!japanese && completion.complete)) && (
          <Check
            size={18}
            className={
              !japanese && completion.complete
                ? 'step-complete-icon'
                : undefined
            }
          />
        )}
      </summary>
      <div className="curriculum-step-body">
        {step.group && (
          <p className="hint">
            {japanese ? '能力分类' : '所属章节'}：{step.group}
          </p>
        )}
        {japanese && step.course && (
          <div className="japanese-source-map">
            <span>学习来源</span>
            <strong>{step.course}</strong>
            <p>
              {step.lesson}
              {step.canDos?.length
                ? ` · ${step.canDos.map((code) => `Can-do ${code}`).join(' / ')}`
                : ' · 文字与发音准备'}
            </p>
          </div>
        )}
        {legacyUnits.length > 0 && (
          <p className="hint">
            {japanese
              ? '原教材步骤的进度和记录已保留，并汇总到这个能力节点。'
              : '旧小节的记录和掌握判断已保留；整节掌握程度单独记录。'}
          </p>
        )}
        <p>
          <strong>怎么学：</strong>
          {step.action}
        </p>
        <Sources sources={step.sources} state={state} />
        {japanese && step.targets?.length ? (
          <div className="japanese-targets">
            <strong>掌握目标</strong>
            <ul>
              {step.targets.map((target, targetIndex) => (
                <li key={`${step.id}:target:${targetIndex}`}>{target}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>
            <strong>完成标准：</strong>
            {step.done}
          </p>
        )}
        {japanese && !current && (
          <JapaneseAbilityEditor
            state={state}
            d={d}
            itemId={step.id}
            actions={actions}
          />
        )}
        <div className="button-row">
          <Button
            disabled={actions.busy || currentSaved}
            onClick={() => void select()}
          >
            {currentSaved
              ? japanese
                ? '当前正在练这一能力'
                : '正在学这一节'
              : current
                ? japanese
                  ? '按当前能力继续学习'
                  : '按整节继续学习'
                : japanese
                  ? '设为当前能力'
                  : '设为当前小节'}
          </Button>
          {!japanese && (
            <Button
              variant="outline"
              disabled={actions.busy}
              onClick={() => void select(true)}
            >
              记录这一节
            </Button>
          )}
        </div>
      </div>
    </details>
  );
}

function UnitOutline({
  unit,
  query,
  ...props
}: Props & { unit: CurriculumUnit; query: string }) {
  const current = currentCurriculumItem(props.state.learning!, props.d);
  const unitMatches = `${unit.title} ${unit.goal}`
    .toLocaleLowerCase()
    .includes(query);
  const steps = unit.steps.filter(
    (s) =>
      !query ||
      unitMatches ||
      `${s.title} ${s.group ?? ''} ${s.topics?.join(' ') ?? ''} ${s.sources.map((r) => `${r.label} ${r.locator}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(query),
  );
  if (!steps.length) return null;
  const japanese = props.d.curriculumId === 'japanese';
  const completed = unit.steps.filter((step) =>
    japanese
      ? ['basic', 'fluent'].includes(
          japaneseAbilityStatusFor(
            curriculumUnitStates(props.state.learning!, props.d, step.id),
          ),
        )
      : unitCompletionProgress(
          curriculumUnitState(props.state.learning!, props.d, step.id),
          props.d,
        ).complete,
  ).length;
  return (
    <details
      className="curriculum-unit"
      data-unit-id={unit.id}
      open={!!query || current?.unit?.id === unit.id}
    >
      <summary>
        <BookOpen size={18} />
        <strong>{unit.title}</strong>
        <span>
          {japanese
            ? completed > 0
              ? `${completed}/${unit.steps.length} 项达到基本掌握`
              : `${unit.steps.length} 项能力`
            : completed > 0
              ? `${completed}/${unit.steps.length} 节完成`
              : `${unit.steps.length} 节`}
        </span>
      </summary>
      <div className="curriculum-unit-body">
        <p>{unit.goal}</p>
        <p className="hint">先修：{unit.prerequisites || '可从这里开始'}</p>
        {steps.map((step) => (
          <Step
            key={step.id}
            {...props}
            step={step}
            index={unit.steps.indexOf(step)}
          />
        ))}
      </div>
    </details>
  );
}

function ProfessionalMap({
  curriculum,
  query,
  ...props
}: Props & { curriculum: Curriculum; query: string }) {
  const nodes = curriculum.nodes ?? [];
  const branches = [...new Set(nodes.map((n) => n.branch))];
  return (
    <div className="professional-map">
      <p className="hint">
        完整保留 31 个核心节点。05「会计基础与会计循环」已展开为 4 个单元、16
        节；其余节点保留目标、先修关系和原方案教材。
      </p>
      {branches.map((branch) => {
        const visible = nodes.filter(
          (n) =>
            n.branch === branch &&
            (!query ||
              `${n.id} ${n.title} ${n.goal} ${n.materials} ${n.branch}`
                .toLocaleLowerCase()
                .includes(query) ||
              n.expanded),
        );
        if (!visible.length) return null;
        return (
          <section className="curriculum-branch" key={branch}>
            <h3>{branch}</h3>
            {visible.map((n) => {
              const saved = curriculumUnitState(
                props.state.learning!,
                props.d,
                n.id,
              );
              const current = !!saved && saved.id === props.d.currentUnitId;
              return (
                <details
                  className="curriculum-node"
                  key={n.id}
                  data-node-id={n.id}
                  open={n.expanded || current || !!query}
                >
                  <summary>
                    <span className="node-number">{n.id.slice(3)}</span>
                    <strong>{n.title}</strong>
                    <small>
                      {n.expanded
                        ? '已展开课节'
                        : current
                          ? '当前节点'
                          : '保留节点'}
                    </small>
                  </summary>
                  <div className="curriculum-node-body">
                    <p>{n.goal}</p>
                    <p className="hint">先修：{n.prerequisites}</p>
                    <p>教材与资料：{n.materials}</p>
                    <p className="hint">原方案 PDF 第 {n.planPage} 页</p>
                    {n.expanded ? (
                      curriculum.units.map((unit) => (
                        <UnitOutline
                          key={unit.id}
                          {...props}
                          unit={unit}
                          query={query}
                        />
                      ))
                    ) : (
                      <>
                        <p className="hint">
                          课节路径待后续展开，可先记录这个节点的学习位置。
                        </p>
                        <Button
                          variant="outline"
                          disabled={props.actions.busy || current}
                          onClick={() =>
                            void props.actions.run('learning.route.select', {
                              directionId: props.d.id,
                              itemId: n.id,
                            })
                          }
                        >
                          {current ? '当前节点' : '设为当前节点'}
                        </Button>
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </section>
        );
      })}
      <details className="curriculum-notes">
        <summary>分支学习顺序与 8 组选修入口</summary>
        <h3>学习顺序</h3>
        <ul>
          {curriculum.branchPaths?.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <h3>选修入口</h3>
        <ul>
          {curriculum.extensions?.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function CurriculumRoute(props: Props) {
  const { state, d, actions } = props;
  const [search, setSearch] = useState('');
  const searchId = useId();
  const c = getCurriculum(d.curriculumId);
  if (!c) return null;
  const query = search.trim().toLocaleLowerCase();
  const current = currentCurriculumItem(state.learning!, d);
  const japanese = d.curriculumId === 'japanese';
  return (
    <section
      className="content-panel curriculum-panel"
      aria-label={`${c.name}学习路线`}
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            {japanese ? 'ABILITY MAP' : 'LEARNING PATH'}
          </div>
          <h2>
            <Map size={20} />
            {japanese ? '能力节点' : '学习路线'}
          </h2>
        </div>
        <span className="curriculum-count">
          {c.nodes ? `${c.nodes.length} 个节点 · ` : ''}
          {c.units.length} 个{japanese ? '能力分类' : '单元'} ·{' '}
          {curriculumStepCount(c)} {japanese ? '项能力' : '节'}
        </span>
      </div>
      <p className="hint">
        {japanese
          ? '教材继续按 IRODORI 原顺序学习；这里按能力查看掌握情况，并为同一能力保留可扩展的教材来源。'
          : '展开单元查看具体学法与资料位置，选择你现在正在学的一节。学习记录会关联到这节，选择位置不会自动标记掌握。'}
      </p>
      <div className="curriculum-toolbar">
        <label className="learning-field">
          <span>{japanese ? '选择当前 IRODORI 位置' : '选择当前学习小节'}</span>
          <select
            aria-label={japanese ? '选择当前 IRODORI 位置' : '选择当前学习小节'}
            disabled={actions.busy}
            value={current?.id ?? ''}
            onChange={(e) => {
              if (e.target.value)
                void actions.run('learning.route.select', {
                  directionId: d.id,
                  itemId: e.target.value,
                });
            }}
          >
            <option value="">
              {japanese ? '选择当前 Lesson / 能力' : '选择已学到的具体位置'}
            </option>
            {c.units.map((u) => (
              <optgroup key={u.id} label={u.title}>
                {u.steps.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {japanese
                      ? `${s.lesson ?? ''} · ${s.title}`
                      : `第${i + 1}节 · ${s.title}`}
                  </option>
                ))}
              </optgroup>
            ))}
            {c.nodes && (
              <optgroup label="专业领域节点">
                {c.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id.slice(3)} · {n.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label className="learning-field" htmlFor={searchId}>
          <span>查找路线内容</span>
          <Input
            id={searchId}
            aria-label="查找路线内容"
            placeholder={
              japanese ? '能力、Lesson 或 Can-do' : '小节、教材章节或主题'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <details className="curriculum-notes">
        <summary>路线安排与资料说明</summary>
        <ul>
          {c.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        {c.resourceNote && <p>{c.resourceNote}</p>}
      </details>
      {c.nodes ? (
        <ProfessionalMap {...props} curriculum={c} query={query} />
      ) : (
        <div className="curriculum-outline">
          {c.units.map((unit) => (
            <UnitOutline key={unit.id} {...props} unit={unit} query={query} />
          ))}
        </div>
      )}
      {query &&
        !c.nodes &&
        !c.units.some(
          (u) =>
            `${u.title} ${u.goal}`.toLocaleLowerCase().includes(query) ||
            u.steps.some((s) =>
              `${s.title} ${s.group ?? ''} ${s.topics?.join(' ') ?? ''} ${s.sources.map((r) => `${r.label} ${r.locator}`).join(' ')}`
                .toLocaleLowerCase()
                .includes(query),
            ),
        ) && <p className="hint">没有找到对应小节，请换一个关键词。</p>}
    </section>
  );
}
