'use client';
import { useId, useState } from 'react';
import { BookOpen, ArrowUpRight, Check, Map } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { Actions } from './study-app';
import type { StudyState } from '@/lib/model';
import { masteryLabels, type Direction } from '@/lib/learning';
import {
  getCurriculum,
  curriculumStepCount,
  curriculumSourceHref,
  curriculumUnitState,
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
      {sources.map((s, i) => {
        const href = curriculumSourceHref(s);
        const missing =
          s.materialId && !state.materials.some((m) => m.id === s.materialId);
        return (
          <li key={`${s.label}:${i}`}>
            <div>
              <strong>{s.label}</strong>
              <p className="source-location">{s.locator}</p>
              <small>{s.status}</small>
              {s.fileName && <p className="hint">原方案：{s.fileName}</p>}
              {missing && (
                <p className="hint">
                  资料库暂未找到这本教材，请补充原件；仍可按上面的章节和页序学习。
                </p>
              )}
            </div>
            {href && !missing && (
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
            )}
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
      <span className="eyebrow">本节学习指引</span>
      <p>{item.scope}</p>
      {item.endCondition && (
        <p>
          <strong>做到什么程度：</strong>
          {item.endCondition}
        </p>
      )}
      {item.node && (
        <p className="hint">
          这个节点暂未拆分课节。原方案教材：{item.node.materials}
          。可先在这里记录学习位置。
        </p>
      )}
      <Sources sources={item.sources} state={state} />
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
  const saved = curriculumUnitState(w, d, step.id);
  const current = saved?.id === d.currentUnitId && !!saved;
  const count = w.records.filter((r) => saved && r.unitId === saved.id).length;
  const select = async (record = false) => {
    if (current) {
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
      className={`curriculum-step ${current ? 'is-current' : ''}`}
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
            {current ? '当前学习 · ' : ''}
            {saved?.contact === 'seen' ? '已接触 · ' : ''}
            {saved ? masteryLabels[saved.mastery] : '尚未记录'}
            {count > 0 ? ` · ${count} 条记录` : ''}
          </small>
        </span>
        {current && <Check size={18} />}
      </summary>
      <div className="curriculum-step-body">
        {step.group && <p className="hint">所属章节：{step.group}</p>}
        <p>
          <strong>怎么学：</strong>
          {step.action}
        </p>
        <Sources sources={step.sources} state={state} />
        <p>
          <strong>完成标准：</strong>
          {step.done}
        </p>
        <div className="button-row">
          <Button
            disabled={actions.busy || current}
            onClick={() => void select()}
          >
            {current ? '正在学这一节' : '设为当前小节'}
          </Button>
          <Button
            variant="outline"
            disabled={actions.busy}
            onClick={() => void select(true)}
          >
            记录这一节
          </Button>
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
      `${s.title} ${s.group ?? ''} ${s.sources.map((r) => `${r.label} ${r.locator}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(query),
  );
  if (!steps.length) return null;
  return (
    <details
      className="curriculum-unit"
      data-unit-id={unit.id}
      open={!!query || current?.unit?.id === unit.id}
    >
      <summary>
        <BookOpen size={18} />
        <strong>{unit.title}</strong>
        <span>{steps.length} 节</span>
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
  return (
    <section
      className="content-panel curriculum-panel"
      aria-label={`${c.name}学习路线`}
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">LEARNING PATH</div>
          <h2>
            <Map size={20} />
            学习路线
          </h2>
        </div>
        <span className="curriculum-count">
          {c.nodes ? `${c.nodes.length} 个节点 · ` : ''}
          {c.units.length} 个单元 · {curriculumStepCount(c)} 节
        </span>
      </div>
      <p className="hint">
        展开单元查看具体学法与资料位置，选择你现在正在学的一节。学习记录会关联到这节，选择位置不会自动标记掌握。
      </p>
      <div className="curriculum-toolbar">
        <label className="learning-field">
          <span>选择当前学习小节</span>
          <select
            aria-label="选择当前学习小节"
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
            <option value="">选择已学到的具体位置</option>
            {c.units.map((u) => (
              <optgroup key={u.id} label={u.title}>
                {u.steps.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    第{i + 1}节 · {s.title}
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
            placeholder="小节、教材章节或主题"
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
              `${s.title} ${s.group ?? ''} ${s.sources.map((r) => `${r.label} ${r.locator}`).join(' ')}`
                .toLocaleLowerCase()
                .includes(query),
            ),
        ) && <p className="hint">没有找到对应小节，请换一个关键词。</p>}
    </section>
  );
}
