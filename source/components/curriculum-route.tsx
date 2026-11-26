'use client';
import { useId, useState } from 'react';
import {
  BookOpen,
  ArrowUpRight,
  ChevronDown,
  Map as MapIcon,
} from 'lucide-react';
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
  curriculumSteps,
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
type DevelopmentNavigation = {
  jump: (id: string) => void;
  titles: Map<string, string>;
  legacyMapping: Partial<Record<string, string[]>>;
  researchTopics: NonNullable<Curriculum['development']>['researchTopics'];
};
const developmentTracks = {
  A: 'A｜计算机科学与软件工程',
  B: 'B｜人工智能原理与研究',
  C: 'C｜AI 应用工程',
};

function StepLinks({
  ids,
  navigation,
}: {
  ids: string[];
  navigation: DevelopmentNavigation;
}) {
  return (
    <span className="development-step-links">
      {ids.map((id) => (
        <button
          className="text-link"
          key={id}
          type="button"
          aria-label={`查看 ${id} ${navigation.titles.get(id) ?? ''}`}
          onClick={() => navigation.jump(id)}
        >
          {id}
        </button>
      ))}
    </span>
  );
}

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
  navigation,
  showDetails,
}: Props & {
  step: CurriculumStep;
  index: number;
  navigation?: DevelopmentNavigation;
  showDetails: boolean;
}) {
  const current = currentCurriculumItem(state.learning!, d)?.id === step.id;
  const completion = curriculumCompletionProgress(state.learning!, d, step.id);
  const japanese = d.curriculumId === 'japanese';
  const developmentFlow =
    d.curriculumId === 'development' && step.id.startsWith('DEV-01-');
  const related = navigation?.legacyMapping[step.id];
  const researchTopics = navigation?.researchTopics.filter((topic) =>
    topic.steps.includes(step.id),
  );
  return (
    <div className="curriculum-step-row" data-step-id={step.id}>
      <details
        className={'curriculum-step' + (current ? ' is-current' : '')}
        open={showDetails || undefined}
      >
        <summary>
          <span className="step-number">
            {step.knowledge ? step.id : String(index + 1).padStart(2, '0')}
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
          {step.knowledge && navigation && (
            <>
              <p>
                <strong>知识：</strong>
                {step.knowledge}
              </p>
              <div className="hint">
                先修：
                {step.prerequisiteIds?.length ? (
                  <StepLinks
                    ids={step.prerequisiteIds}
                    navigation={navigation}
                  />
                ) : (
                  '可直接开始'
                )}
              </div>
            </>
          )}
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
                <strong>{step.knowledge ? '任务与实践：' : '怎么学：'}</strong>
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
          {navigation && related && (
            <div className="hint">
              对应新版：
              <StepLinks ids={related} navigation={navigation} />
            </div>
          )}
          {!!researchTopics?.length && (
            <p className="hint">
              研究回看：
              {researchTopics.map((topic) => topic.question).join('／')}
            </p>
          )}
          {navigation && !current && (
            <button
              type="button"
              className="text-link"
              disabled={actions.busy || actions.hasDraft}
              onClick={() =>
                void actions.run('learning.route.select', {
                  directionId: d.id,
                  itemId: step.id,
                })
              }
            >
              设为当前小节
            </button>
          )}
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

function matchesStep(step: CurriculumStep, query: string) {
  return `${step.knowledge ? step.id + ' ' + step.knowledge + ' ' : ''}${step.title} ${step.group ?? ''} ${step.topics?.join(' ') ?? ''} ${step.sources.map((r) => `${r.label} ${r.locator}`).join(' ')}`
    .toLocaleLowerCase()
    .includes(query);
}

function UnitOutline({
  unit,
  query,
  navigation,
  stepIds,
  ...props
}: Props & {
  unit: CurriculumUnit;
  query: string;
  navigation?: DevelopmentNavigation;
  stepIds?: Set<string>;
}) {
  const current = currentCurriculumItem(props.state.learning!, props.d);
  const unitMatches = `${unit.title} ${unit.goal}`
    .toLocaleLowerCase()
    .includes(query);
  const steps = unit.steps.filter(
    (s) =>
      (!stepIds || stepIds.has(s.id)) &&
      (!query || unitMatches || matchesStep(s, query)),
  );
  if (!steps.length) return null;
  const progressSteps = stepIds
    ? unit.steps.filter((s) => stepIds.has(s.id))
    : unit.steps;
  const completed = progressSteps.filter(
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
            ? `${completed}/${progressSteps.length} 节完成`
            : `${progressSteps.length} 节`}
        </span>
      </summary>
      <div className="curriculum-unit-body">
        <p>{unit.goal}</p>
        {(unit.prerequisites || !navigation) && (
          <p className="hint">先修：{unit.prerequisites || '可从这里开始'}</p>
        )}
        {unit.evidence && (
          <p>
            <strong>阶段验收：</strong>
            {unit.evidence}
          </p>
        )}
        {steps.map((step) => (
          <Step
            key={step.id}
            {...props}
            step={step}
            index={unit.steps.indexOf(step)}
            navigation={navigation}
            showDetails={!!navigation && query === step.id.toLowerCase()}
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
  const [routeView, setRouteView] = useState<string>();
  const searchId = useId();
  const c = getCurriculum(d.curriculumId);
  if (!c) return null;
  const query = search.trim().toLocaleLowerCase();
  const current = currentCurriculumItem(state.learning!, d);
  const japanese = d.curriculumId === 'japanese';
  const development = c.development;
  const view =
    routeView ?? (current?.id.startsWith('DEV-') ? 'legacy' : 'knowledge');
  const milestone = development?.milestones.find((phase) => phase.id === view);
  const entries = development ? curriculumSteps(c) : [];
  const scope = milestone
    ? new Set(Object.values(milestone.lanes).flat())
    : undefined;
  const stageSteps = scope
    ? entries.filter(
        ({ unit, step }) => scope.has(unit.id) || scope.has(step.id),
      )
    : undefined;
  const stageIds = stageSteps && new Set(stageSteps.map(({ step }) => step.id));
  const stageCompleted = stageSteps?.filter(
    ({ step }) =>
      curriculumCompletionProgress(state.learning!, d, step.id).complete,
  ).length;
  const outlineUnits =
    view === 'legacy' && development ? development.legacyUnits : c.units;
  const navigation: DevelopmentNavigation | undefined = development && {
    titles: new Map(entries.map(({ step }) => [step.id, step.title])),
    legacyMapping: development.legacyMapping,
    researchTopics: development.researchTopics,
    jump(id) {
      setRouteView('knowledge');
      setSearch(id);
      document.getElementById(searchId)?.focus();
    },
  };
  return (
    <section
      className="content-panel curriculum-panel"
      aria-label={`${c.name}学习路线`}
    >
      <div className="section-heading">
        <div>
          <h2>
            <MapIcon size={20} />
            {japanese ? '能力节点' : development ? '开发学习路线' : '学习目录'}
          </h2>
        </div>
        <span className="curriculum-count">
          {c.nodes ? `${c.nodes.length} 个节点 · ` : ''}
          {c.units.length} 个{japanese ? '能力分类' : '单元'} ·{' '}
          {curriculumStepCount(c)} {japanese ? '项能力' : '节'}
        </span>
      </div>
      {japanese && <p className="hint">按 IRODORI 教材顺序学习。</p>}
      {development && (
        <label className="learning-field development-view">
          <span>路线视图</span>
          <select
            value={view}
            onChange={(e) => {
              setSearch('');
              setRouteView(e.target.value);
            }}
          >
            <option value="knowledge">A / B / C 知识目录</option>
            {development.milestones.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.id} · {phase.title}
              </option>
            ))}
            <option value="legacy">旧路线与进度</option>
          </select>
        </label>
      )}
      {milestone && (
        <div className="development-checkpoint">
          <h3>
            {milestone.id} · {milestone.title}{' '}
            <small>
              {stageCompleted}/{stageSteps?.length} 节完成
            </small>
          </h3>
          <p>{milestone.task}</p>
          <p>
            <strong>阶段证据：</strong>
            {milestone.evidence}
          </p>
        </div>
      )}
      {development && navigation && view === 'knowledge' && (
        <details className="curriculum-notes">
          <summary>学习方法、项目与研究问题</summary>
          <ul>
            {c.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
            <li>
              每次 30—60
              分钟。先预测，再独立从阅读、追踪做到修改、实现与设计。每节保留关键概念、能解释的代码或示意，以及一次验证结果。
            </li>
            <li>
              序流练收支和 Web，Lecture Studio
              练本地任务和并发，学迹练保存和版本冲突，Kurisu 与 Sinefine
              用于迁移。AI 实验沿 Notebook N0—N5 持续推进。
            </li>
            {development.researchTopics.map((topic) => (
              <li key={topic.question}>
                {topic.question}{' '}
                <StepLinks ids={topic.steps} navigation={navigation} />
              </li>
            ))}
          </ul>
        </details>
      )}
      {development && view === 'legacy' && (
        <p className="hint">
          旧小节保留原完成状态。可从详情查看对应新版小节并按新验收复核。
        </p>
      )}
      <div className="curriculum-toolbar">
        <label className="learning-field">
          <span>{japanese ? '选择当前 IRODORI 位置' : '选择当前学习小节'}</span>
          <select
            aria-label={japanese ? '选择当前 IRODORI 位置' : '选择当前学习小节'}
            disabled={actions.busy || (development && actions.hasDraft)}
            value={current?.id ?? ''}
            onChange={async (e) => {
              const itemId = e.target.value;
              if (!itemId) return;
              const result = await actions.run('learning.route.select', {
                directionId: d.id,
                itemId,
              });
              if (result && development) {
                const legacyItem = itemId.startsWith('DEV-');
                if (
                  legacyItem !== (view === 'legacy') ||
                  (stageIds && !stageIds.has(itemId))
                ) {
                  setSearch('');
                  setRouteView(legacyItem ? 'legacy' : 'knowledge');
                }
              }
            }}
          >
            <option value="">
              {japanese ? '选择当前 Lesson / 能力' : '选择已学到的具体位置'}
            </option>
            {[...c.units, ...(development?.legacyUnits ?? [])].map((u) => (
              <optgroup
                key={u.id}
                label={
                  u.id.startsWith('DEV-') ? '旧路线 · ' + u.title : u.title
                }
              >
                {u.steps.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {s.knowledge
                      ? `${s.id} · ${s.title}`
                      : japanese
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
      ) : development && view !== 'legacy' ? (
        <div className="curriculum-outline">
          {Object.entries(developmentTracks)
            .filter(([key]) =>
              outlineUnits.some(
                (u) =>
                  u.branch === key &&
                  (!stageIds || u.steps.some((step) => stageIds.has(step.id))),
              ),
            )
            .map(([key, name]) => (
              <section
                className="development-track"
                key={key}
                aria-label={name}
              >
                <h3>{name}</h3>
                {outlineUnits
                  .filter((unit) => unit.branch === key)
                  .map((unit) => (
                    <UnitOutline
                      key={unit.id}
                      {...props}
                      unit={unit}
                      query={query}
                      navigation={navigation}
                      stepIds={stageIds}
                    />
                  ))}
              </section>
            ))}
        </div>
      ) : (
        <div className="curriculum-outline">
          {outlineUnits.map((unit) => (
            <UnitOutline
              key={unit.id}
              {...props}
              unit={unit}
              query={query}
              navigation={navigation}
            />
          ))}
        </div>
      )}
      {query &&
        !c.nodes &&
        !outlineUnits.some((u) =>
          u.steps.some(
            (s) =>
              (!stageIds || stageIds.has(s.id)) &&
              (`${u.title} ${u.goal}`.toLocaleLowerCase().includes(query) ||
                matchesStep(s, query)),
          ),
        ) && <p className="hint">没有找到对应小节，请换一个关键词。</p>}
    </section>
  );
}
