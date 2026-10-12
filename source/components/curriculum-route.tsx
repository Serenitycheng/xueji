'use client';
import { useId, useState } from 'react';
import { BookOpen, ArrowUpRight, ChevronDown, Map } from 'lucide-react';
import { Input } from './ui/input';
import { PdfOpenButton } from './pdf-open-button';
import { LessonCompletion } from './lesson-completion';
import type { Actions } from './study-app';
import type { StudyState } from '@/lib/model';
import {
  obsidianLink,
  curriculumCompletionProgress,
  type Direction,
} from '@/lib/learning';
import {
  getCurriculum,
  curriculumStepCount,
  curriculumSourceHref,
  resolveCurriculumSource,
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
};

function Sources({
  sources,
  state,
  compact = false,
}: {
  sources: CurriculumSource[];
  state: StudyState;
  compact?: boolean;
}) {
  return (
    <ul className={`curriculum-sources${compact ? ' is-compact' : ''}`}>
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
              {!compact && <small>{s.status}</small>}
              {!compact && s.fileName && (
                <p className="hint">原方案：{s.fileName}</p>
              )}
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

function DevelopmentNodeFlow({
  action,
  done,
  sources,
  state,
}: {
  action: string;
  done: string;
  sources: CurriculumSource[];
  state: StudyState;
}) {
  const [primary, ...supporting] = sources;
  return (
    <ol className="development-workflow">
      <li>
        <span>1</span>
        <div>
          <strong>GPT 生成提纲</strong>
          <p>按模板列出本节 3—5 个关键问题，先不展开答案。</p>
          <a
            className="text-link development-template-link"
            href={obsidianLink('obsidian vault', '模板/开发-节点学习模板')}
          >
            打开节点模板
          </a>
        </div>
      </li>
      <li>
        <span>2</span>
        <div>
          <strong>看教材</strong>
          <p>带着提纲阅读本节范围，只补充关键概念和例子。</p>
          {primary && <Sources sources={[primary]} state={state} compact />}
          {supporting.length > 0 && (
            <details className="development-workflow-support">
              <summary>卡住时再查补充资料</summary>
              <Sources sources={supporting} state={state} compact />
            </details>
          )}
        </div>
      </li>
      <li>
        <span>3</span>
        <div>
          <strong>自己回答</strong>
          <p>合上教材，用自己的话回答提纲，并标出一个不确定点。</p>
        </div>
      </li>
      <li>
        <span>4</span>
        <div>
          <strong>做项目</strong>
          <p>{action}</p>
        </div>
      </li>
      <li>
        <span>5</span>
        <div>
          <strong>GPT 复盘</strong>
          <p>提交回答、代码和运行结果，让 GPT 纠错并整理回本节笔记。</p>
          <p className="development-workflow-done">
            <strong>完成判断：</strong>
            {done}
          </p>
        </div>
      </li>
    </ol>
  );
}

function Step({
  step,
  index,
  state,
  d,
  actions,
}: Props & { step: CurriculumStep; index: number }) {
  const current = currentCurriculumItem(state.learning!, d)?.id === step.id;
  const completion = curriculumCompletionProgress(state.learning!, d, step.id);
  const japanese = d.curriculumId === 'japanese';
  const developmentFlow =
    d.curriculumId === 'development' && step.id.startsWith('DEV-01-');
  return (
    <div className="curriculum-step-row" data-step-id={step.id}>
      <details className={'curriculum-step' + (current ? ' is-current' : '')}>
        <summary>
          <span className="step-number">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="step-title">
            {step.title}
            {(step.optional || current || (japanese && step.lesson)) && (
              <small>
                {[
                  step.optional ? '选学' : '',
                  japanese ? step.lesson : '',
                  current ? '当前小节' : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            )}
          </span>
          <ChevronDown
            size={15}
            className="step-disclosure"
            aria-hidden="true"
          />
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
                  ? ' · Can-do ' + step.canDos.join(' / ')
                  : ''}
              </p>
            </div>
          )}
          {developmentFlow ? (
            <DevelopmentNodeFlow
              action={step.action}
              done={step.done}
              sources={step.sources}
              state={state}
            />
          ) : (
            <>
              <p>
                <strong>怎么学：</strong>
                {step.action}
              </p>
              <Sources sources={step.sources} state={state} />
            </>
          )}
          {japanese && step.targets?.length ? (
            <div className="japanese-targets">
              <strong>掌握目标</strong>
              <ul>
                {step.targets.map((target, i) => (
                  <li key={i}>{target}</li>
                ))}
              </ul>
            </div>
          ) : !developmentFlow ? (
            <p>
              <strong>完成标准：</strong>
              {step.done}
            </p>
          ) : null}
        </div>
      </details>
      <LessonCompletion
        title={step.title}
        completed={completion.complete}
        directionId={d.id}
        itemId={step.id}
        actions={actions}
      />
    </div>
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
  const completed = unit.steps.filter(
    (step) =>
      curriculumCompletionProgress(props.state.learning!, props.d, step.id)
        .complete,
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
          {completed > 0
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
              const current =
                currentCurriculumItem(props.state.learning!, props.d)?.id ===
                n.id;
              const completion = curriculumCompletionProgress(
                props.state.learning!,
                props.d,
                n.id,
              );
              return (
                <div
                  className="curriculum-node-row"
                  key={n.id}
                  data-node-id={n.id}
                >
                  <details
                    className="curriculum-node"
                    open={n.expanded || !!query}
                  >
                    <summary>
                      <span className="node-number">{n.id.slice(3)}</span>
                      <strong>{n.title}</strong>
                      {current && <small>当前节点</small>}
                      <ChevronDown
                        size={15}
                        className="step-disclosure"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="curriculum-node-body">
                      <p>{n.goal}</p>
                      <p className="hint">先修：{n.prerequisites}</p>
                      <p>教材与资料：{n.materials}</p>
                      <p className="hint">原方案 PDF 第 {n.planPage} 页</p>
                      {n.expanded
                        ? curriculum.units.map((unit) => (
                            <UnitOutline
                              key={unit.id}
                              {...props}
                              unit={unit}
                              query={query}
                            />
                          ))
                        : null}
                    </div>
                  </details>
                  <LessonCompletion
                    title={n.title}
                    completed={completion.complete}
                    directionId={props.d.id}
                    itemId={n.id}
                    actions={props.actions}
                  />
                </div>
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
  const development = d.curriculumId === 'development';
  const developmentGroups = development
    ? c.units.reduce<{ name: string; units: CurriculumUnit[] }[]>(
        (groups, unit) => {
          const last = groups.at(-1);
          if (last?.name === unit.branch) last.units.push(unit);
          else groups.push({ name: unit.branch, units: [unit] });
          return groups;
        },
        [],
      )
    : [];
  return (
    <section
      className="content-panel curriculum-panel"
      aria-label={`${c.name}学习路线`}
    >
      <div className="section-heading">
        <div>
          <h2>
            <Map size={20} />
            {japanese
              ? '能力节点'
              : development
                ? 'AI 与开发 · 三条线'
                : '学习目录'}
          </h2>
        </div>
        <span className="curriculum-count">
          {c.nodes ? `${c.nodes.length} 个节点 · ` : ''}
          {c.units.length} 个{japanese ? '能力分类' : '单元'} ·{' '}
          {curriculumStepCount(c)} {japanese ? '项能力' : '节'}
        </span>
      </div>
      {(japanese || development) && (
        <p className="hint">
          {japanese
            ? '按 IRODORI 教材顺序学习。'
            : development
              ? '开发流程与 AI 认知第一遍 → 开发基础 → AI 实践第二遍。'
              : ''}
        </p>
      )}
      {development && (
        <div className="development-path" aria-label="开发学习的三条线">
          <p>
            <strong>开发流程线</strong>
            <span>先学做项目的方法，之后持续用于真实改动。</span>
          </p>
          <p>
            <strong>AI认知线</strong>
            <span>先理解模型、Agent 与评估；有基础后再动手实现。</span>
          </p>
          <p>
            <strong>开发基础线</strong>
            <span>
              Python＋工具同步 → 运行原理 → 算法 → 网络 → 数据库 → 软件工程。
            </span>
          </p>
        </div>
      )}
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
      {c.nodes ? (
        <ProfessionalMap {...props} curriculum={c} query={query} />
      ) : development ? (
        <div className="curriculum-outline">
          {developmentGroups.map((group) => (
            <section
              className="development-track"
              key={group.name}
              aria-label={group.name}
            >
              <h3>{group.name}</h3>
              {group.units.map((unit) => (
                <UnitOutline
                  key={unit.id}
                  {...props}
                  unit={unit}
                  query={query}
                />
              ))}
            </section>
          ))}
        </div>
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
