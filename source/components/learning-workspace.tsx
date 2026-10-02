'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Field } from './ui-parts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  BookOpen,
  ArrowRight,
  Plus,
  Copy,
  Link2,
  Pin,
  Check,
} from 'lucide-react';
import type { Actions } from './study-app';
import type { StudyState, Material } from '@/lib/model';
import { localStore } from '@/lib/client-store';
import { CurriculumRoute, CurrentCurriculumLesson } from './curriculum-route';
import { JapaneseAbilityEditor, JapaneseDashboard } from './japanese-abilities';
import { PdfOpenButton } from './pdf-open-button';
import {
  getCurriculum,
  curriculumStepCount,
  curriculumUnitStates,
  currentCurriculumItem,
} from '@/lib/curriculum';
import {
  abilityStatusLabels,
  japaneseAbilityStatusFor,
  masteryLabels,
  evidenceLabels,
  suggestions,
  copyActionText,
  safeReferenceHref,
  obsidianLink,
  unitCompletionProgress,
  type CompletionPart,
  type Direction,
  type Unit,
  type Reference,
  type LearningWorkspace,
} from '@/lib/learning';

type Props = {
  state: StudyState;
  actions: Actions;
  open: (id: string) => void;
};
const completionLabels: Record<CompletionPart, string> = {
  lesson: '本节',
  'self-study': '预习／自学',
  'class-notes': '上课＋补笔记',
  homework: '作业',
  qa: '答疑',
};
const statuses = {
  active: '进行中',
  paused: '暂停',
  completed: '完成',
  archived: '归档',
};
function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="learning-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
const option = (value: string, label: string) => ({ value, label });
function stamp(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '来源于旧记录';
}
async function copy(text: string, actions: Actions) {
  try {
    await navigator.clipboard.writeText(text);
    actions.notify('已复制');
  } catch {
    actions.notify('无法访问剪贴板，请选中下方文字手动复制。');
  }
}
export function DirectionCard({
  d,
  w,
  open,
}: {
  d: Direction;
  w: LearningWorkspace;
  open: (id: string) => void;
}) {
  const unit = w.units.find((u) => u.id === d.currentUnitId),
    curriculumItem = currentCurriculumItem(w, d),
    action = w.actions.find((a) => a.id === d.currentActionId),
    last = w.records.filter((r) => r.directionId === d.id).at(-1),
    lastResult = w.records
      .filter((r) => r.directionId === d.id && r.result)
      .at(-1)?.result,
    currentContent = curriculumItem?.step?.title ?? unit?.name,
    curriculum = getCurriculum(d.curriculumId);
  return (
    <article className="learning-card">
      <div className="learning-card-top">
        <span className="eyebrow">
          {statuses[d.status]}
          {d.pinned ? ' · 置顶' : ''}
        </span>
        {d.origin === 'legacy' && <small>沿用旧档案</small>}
      </div>
      <div className="learning-card-heading">
        <h2>{d.name}</h2>
        {curriculum && (
          <p className="hint">
            学习路线 · {curriculumStepCount(curriculum)} 节
          </p>
        )}
      </div>
      <dl>
        <dt>当前内容</dt>
        <dd className={currentContent ? 'current-content' : 'empty-value'}>
          {currentContent ??
            (d.curriculumId
              ? '从路线中选择当前正在学的小节'
              : '尚未确定，可以直接写下当前内容')}
        </dd>
        <dt>上次停点</dt>
        <dd className={lastResult ? undefined : 'empty-value'}>
          {lastResult || '还没有停点记录'}
        </dd>
        <dt>{d.kind === 'reading' ? '正在思考' : '当前卡点'}</dt>
        <dd className={unit?.blocker ? undefined : 'empty-value'}>
          {unit?.blocker || '尚未记录'}
        </dd>
      </dl>
      <div className="next-step">
        <small>下一步</small>
        <p className={action?.title ? undefined : 'empty-value'}>
          {action?.title ?? '下一步尚未确定'}
        </p>
        {action?.start && <span>从 {action.start} 开始</span>}
        {last?.nextMode === 'keep' && <small>上次记录未更新下一步</small>}
      </div>
      <Button
        variant="ghost"
        className="learning-continue"
        onClick={() => open(d.id)}
      >
        继续学习
        <ArrowRight size={16} />
      </Button>
    </article>
  );
}
function subscribeRecent(listener: () => void) {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
function readRecent() {
  try {
    return localStorage.getItem('xuexu-last-direction') ?? '';
  } catch {
    return '';
  }
}
export function LearningHome({ state, actions, open }: Props) {
  const w = state.learning!,
    active = w.directions.filter((d) => d.status === 'active');
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => '');
  const sorted = [...active].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      Number(b.id === recent) - Number(a.id === recent),
  );
  return (
    <section className="learning-home" aria-labelledby="learning-home-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div>
          <h1 id="learning-home-title">继续学习</h1>
          <p>找到上次的起点，把下一步留给下次的自己。</p>
        </div>
        <Button variant="outline" onClick={() => actions.navigate('routes')}>
          <Plus />
          新建学习方向
        </Button>
      </div>
      {!w.directions.length ? (
        <section className="learning-empty">
          <BookOpen size={32} />
          <h2>建立第一个学习方向</h2>
          <p>只需要一个名称。材料、路线和 AI 都可以稍后再准备。</p>
          <Button onClick={() => actions.navigate('routes')}>
            建立学习方向
          </Button>
        </section>
      ) : !active.length ? (
        <section className="learning-empty">
          <h2>当前没有进行中的方向</h2>
          <p>原有记录和下一步仍在，准备好时再恢复。</p>
          <Button onClick={() => actions.navigate('routes')}>
            查看暂停和归档的方向
          </Button>
        </section>
      ) : (
        <>
          <p className="hint home-direction-count">
            进行中的方向 · {active.length}
          </p>
          <div className="learning-grid">
            {sorted.slice(0, 6).map((d) => (
              <DirectionCard key={d.id} d={d} w={w} open={open} />
            ))}
          </div>
          {sorted.length > 6 && (
            <details className="home-more-directions">
              <summary>其他 {sorted.length - 6} 个进行中的方向</summary>
              <div className="learning-grid">
                {sorted.slice(6).map((d) => (
                  <DirectionCard key={d.id} d={d} w={w} open={open} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
      {w.directions.some((d) => d.status !== 'active') && (
        <div className="learning-bottom">
          <Button variant="outline" onClick={() => actions.navigate('routes')}>
            查看暂停、完成和归档方向（
            {w.directions.filter((d) => d.status !== 'active').length}）
          </Button>
        </div>
      )}
    </section>
  );
}
export function DirectionsView({ state, actions, open }: Props) {
  const w = state.learning!,
    [name, setName] = useState(''),
    [kind, setKind] = useState('course');
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>学习方向</h1>
          <p>课程、技能或持续探索的问题，都从一个小起点开始。</p>
        </div>
      </div>
      <form
        className="content-panel direction-create"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await actions.run('learning.direction.create', {
            name,
            kind,
          });
          if (r) {
            setName('');
            open(r.snapshot.state.learning!.directions.at(-1)!.id);
          }
        }}
      >
        <Field label="方向名称">
          <Input
            aria-label="方向名称"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你想继续学习什么？"
            required
          />
        </Field>
        <Choice
          label="方向类型"
          value={kind}
          onChange={setKind}
          options={[
            option('course', '课程'),
            option('skill', '技能'),
            option('reading', '阅读与探索'),
          ]}
        />
        <Button
          disabled={actions.busy || actions.hasDraft || !name.trim()}
          type="submit"
        >
          <Plus />
          建立方向
        </Button>
      </form>
      {(['active', 'paused', 'completed', 'archived'] as const).map(
        (status) => (
          <section className="direction-section" key={status}>
            <h2>
              {statuses[status]} ·{' '}
              {w.directions.filter((d) => d.status === status).length}
            </h2>
            {w.directions
              .filter((d) => d.status === status)
              .map((d) => (
                <div className="direction-row" key={d.id}>
                  <button
                    className="direction-title"
                    onClick={() => open(d.id)}
                  >
                    <strong>{d.name}</strong>
                    <span>{d.goal || '阶段目标可稍后补充'}</span>
                  </button>
                  <div className="button-row">
                    <Button
                      variant="ghost"
                      aria-label={'上移方向 ' + d.name}
                      disabled={actions.busy || w.directions[0].id === d.id}
                      onClick={() =>
                        void actions.run('learning.direction.move', {
                          directionId: d.id,
                          delta: 'up',
                        })
                      }
                    >
                      上移
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={'下移方向 ' + d.name}
                      disabled={
                        actions.busy || w.directions.at(-1)?.id === d.id
                      }
                      onClick={() =>
                        void actions.run('learning.direction.move', {
                          directionId: d.id,
                          delta: 'down',
                        })
                      }
                    >
                      下移
                    </Button>
                    <Button variant="outline" onClick={() => open(d.id)}>
                      查看与调整
                    </Button>
                  </div>
                </div>
              ))}
          </section>
        ),
      )}
    </>
  );
}
export function ReferenceEntry({
  reference: r,
  material,
  actions,
  onEdit,
}: {
  reference: Reference;
  material?: Material;
  actions: Actions;
  onEdit?: () => void;
}) {
  const href = safeReferenceHref(r),
    [failed, setFailed] = useState(''),
    [checking, setChecking] = useState(false);
  async function openAttachment() {
    setChecking(true);
    try {
      const response = await fetch(href!, { method: 'GET' });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? '原件暂时无法读取');
      }
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setFailed('');
    } catch (e) {
      setFailed(
        e instanceof Error ? e.message : '原件暂时无法读取，请稍后重试。',
      );
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="reference-row">
      <div>
        <strong>
          {r.primary ? '主材料 · ' : ''}
          {r.name}
        </strong>
        <p>{r.location || r.purpose || '位置与用途可稍后补充'}</p>
        {r.location && r.purpose && <p className="hint">{r.purpose}</p>}
        {r.kind === 'local' && <p className="hint">此路径仅适用于相应设备</p>}
        {r.kind === 'note' && (
          <p className="hint">
            需要本机安装对应应用并存在该笔记；打不开时可复制路径。学迹未读取笔记正文。
          </p>
        )}
        <small className="reference-target">{r.target}</small>
        {failed && (
          <p role="alert" className="form-error">
            {failed}
          </p>
        )}
      </div>
      <div className="button-row">
        {href &&
          (r.kind === 'attachment' &&
          material?.kind === 'pdf' &&
          !material.url ? (
            <PdfOpenButton
              resource={{ kind: 'material', materialId: material.id }}
              title={material.name}
              label="打开原件"
            />
          ) : r.kind === 'attachment' ? (
            <Button
              variant="outline"
              disabled={checking}
              onClick={() => void openAttachment()}
            >
              {checking ? '正在读取…' : '打开原件'}
            </Button>
          ) : (
            <a
              className="resource-open"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {r.kind === 'note' ? '打开笔记' : '打开材料'}
            </a>
          ))}
        <Button
          variant="ghost"
          onClick={() =>
            void copy(
              r.name + '\n' + r.target + (r.location ? '\n' + r.location : ''),
              actions,
            )
          }
        >
          复制入口
        </Button>
        {onEdit && (
          <Button variant="ghost" onClick={onEdit}>
            编辑引用
          </Button>
        )}
      </div>
    </div>
  );
}
type RecordFormData = {
  entryId: string;
  result: string;
  mastery: string;
  contact: string;
  nextTitle: string;
  nextMode: string;
  nextStart: string;
  nextEnd: string;
  blockerMode: string;
  blocker: string;
  evidenceType: string;
  evidence: string;
  correctsId?: string;
};
function blankRecord(): RecordFormData {
  return {
    entryId: crypto.randomUUID(),
    result: '',
    mastery: 'keep',
    contact: 'keep',
    nextTitle: '',
    nextMode: 'keep',
    nextStart: '',
    nextEnd: '',
    blockerMode: 'keep',
    blocker: '',
    evidenceType: '',
    evidence: '',
  };
}
function RecordForm({
  d,
  u,
  w,
  actions,
  onDone,
  correction,
}: {
  d: Direction;
  u?: Unit;
  w: LearningWorkspace;
  actions: Actions;
  onDone: () => void;
  correction?: string;
}) {
  const key =
      'learning-record:' +
      d.id +
      ':' +
      (u?.id ?? 'none') +
      (correction ? ':' + correction : ''),
    [form, setForm] = useState<RecordFormData>(blankRecord),
    [ready, setReady] = useState(false),
    [draftMessage, setDraftMessage] = useState('');
  const [initialCorrection] = useState(() =>
    w.records.find((r) => r.id === correction),
  );
  useEffect(() => {
    let active = true;
    void localStore
      .form(key)
      .then((saved) => {
        if (!active) return;
        if (saved) setForm(saved as RecordFormData);
        else if (correction) {
          const old = initialCorrection;
          if (old)
            setForm({
              ...blankRecord(),
              result: old.result,
              mastery: old.mastery ?? 'keep',
              contact: old.contact ?? 'keep',
              blockerMode: old.blocker !== undefined ? 'change' : 'keep',
              blocker: old.blocker ?? '',
              evidenceType: old.evidenceType ?? '',
              evidence: old.evidence,
              correctsId: correction,
            });
        }
        setReady(true);
        setDraftMessage(saved ? '已恢复本机表单草稿，尚未提交' : '');
      })
      .catch(() => {
        if (active) {
          setReady(true);
          setDraftMessage('本机无法保存表单草稿，请保持页面打开。');
        }
      });
    return () => {
      active = false;
    };
  }, [key, correction, initialCorrection]);
  useEffect(() => {
    if (ready && w.records.some((r) => r.id === 'record:' + form.entryId)) {
      void localStore.removeForm(key);
      onDone();
    }
  }, [ready, w.records, form.entryId, key, onDone]);
  function update(values: Partial<RecordFormData>) {
    const next = { ...form, ...values };
    setForm(next);
    void localStore
      .saveForm(key, next)
      .then(() => setDraftMessage('表单已保留在本机，尚未提交到云端'))
      .catch(() => setDraftMessage('本机无法保存草稿，请保持页面打开。'));
  }
  async function save(e: { preventDefault(): void }) {
    e.preventDefault();
    const r = await actions.run('learning.record.save', {
      ...form,
      directionId: d.id,
      unitId: u?.id,
      nextMode:
        form.nextTitle.trim() && form.nextMode !== 'clear'
          ? 'replace'
          : form.nextMode,
      blocker: form.blockerMode === 'change' ? form.blocker : undefined,
    });
    if (r) {
      await localStore.removeForm(key).catch(() => {});
      onDone();
    }
  }
  return (
    <form onSubmit={save}>
      <fieldset
        disabled={!ready || actions.busy || actions.hasDraft}
        className="learning-form"
      >
        <p className="hint">
          {d.name} · {u?.name ?? '尚未设置单元'}
          {correction ? ' · 修正最近记录，原记录继续保留' : ''}
        </p>
        <Field label="本次做到哪里／发生了什么">
          <Textarea
            aria-label="本次做到哪里"
            rows={3}
            value={form.result}
            maxLength={2000}
            onChange={(e) => update({ result: e.target.value })}
            placeholder="只写一句停点也可以"
          />
        </Field>
        {d.kind !== 'reading' && d.curriculumId !== 'japanese' && u && (
          <Choice
            label="当前判断"
            value={form.mastery}
            onChange={(mastery) => update({ mastery })}
            options={[
              option('keep', '暂不判断，保持原状'),
              option('unknown', '明确设为未判断'),
              option('reinforce', '需要巩固'),
              option('independent', '能够独立完成'),
            ]}
          />
        )}
        <Field label="下次从哪里继续">
          <Textarea
            aria-label="下次从哪里继续"
            value={form.nextTitle}
            onChange={(e) =>
              update({
                nextTitle: e.target.value,
                nextMode: e.target.value.trim() ? 'replace' : 'keep',
              })
            }
            placeholder="留空会保留原有下一步，不会清空"
          />
        </Field>
        <details>
          <summary>卡点、依据与更多接续信息</summary>
          <div className="learning-form">
            {u && (
              <>
                <Choice
                  label="内容接触状态"
                  value={form.contact}
                  onChange={(contact) => update({ contact })}
                  options={[
                    option('keep', '保持原状'),
                    option('seen', '已接触'),
                    option('unseen', '未接触'),
                  ]}
                />
                <Choice
                  label="卡点处理"
                  value={form.blockerMode}
                  onChange={(blockerMode) => update({ blockerMode })}
                  options={[
                    option('keep', '保留当前卡点'),
                    option('change', '更新或明确清除卡点'),
                  ]}
                />
                {form.blockerMode === 'change' && (
                  <Field label="当前卡点（留空表示已解决并清除）">
                    <Textarea
                      aria-label="当前卡点"
                      value={form.blocker}
                      onChange={(e) => update({ blocker: e.target.value })}
                    />
                  </Field>
                )}
              </>
            )}
            <Choice
              label="依据类型"
              value={form.evidenceType}
              onChange={(evidenceType) => update({ evidenceType })}
              options={[
                option('', '选填；直接判断默认记为用户自评'),
                ...Object.entries(evidenceLabels).map(([value, label]) =>
                  option(value, label),
                ),
              ]}
            />
            <Field label="依据或练习结果">
              <Textarea
                aria-label="依据或练习结果"
                value={form.evidence}
                onChange={(e) => update({ evidence: e.target.value })}
              />
            </Field>
            <Field label="下一步开始位置">
              <Input
                aria-label="下一步开始位置"
                value={form.nextStart}
                onChange={(e) => update({ nextStart: e.target.value })}
              />
            </Field>
            <Field label="本次结束条件">
              <Input
                aria-label="本次结束条件"
                value={form.nextEnd}
                onChange={(e) => update({ nextEnd: e.target.value })}
              />
            </Field>
            <Choice
              label="下一步处理"
              value={form.nextMode}
              onChange={(nextMode) =>
                update({
                  nextMode,
                  nextTitle: nextMode === 'replace' ? form.nextTitle : '',
                })
              }
              options={[
                option('keep', '保留原有下一步（尚未更新）'),
                option('replace', '使用这次填写的下一步'),
                option('clear', '明确暂不设置下一步'),
              ]}
            />
          </div>
        </details>
        <output className="hint">{draftMessage}</output>
        <Button type="submit">
          {actions.busy ? '正在保存…' : '保存学习记录'}
        </Button>
      </fieldset>
      {actions.hasDraft && (
        <p className="notice">
          上次提交尚未确认。输入仍保留，请在同步与版本中处理。
        </p>
      )}
    </form>
  );
}

export function DirectionDetail({
  state,
  actions,
  d,
}: Props & { d: Direction }) {
  const w = state.learning!,
    units = w.units.filter((u) => u.directionId === d.id),
    personalUnits = units.filter((u) => !u.curriculumItemId),
    u = units.find((u) => u.id === d.currentUnitId),
    a = w.actions.find((a) => a.id === d.currentActionId),
    last = w.records.filter((r) => r.directionId === d.id).at(-1);
  const lessonCompletion = u ? unitCompletionProgress(u, d) : undefined;
  const currentItem = currentCurriculumItem(w, d);
  const japanese = d.curriculumId === 'japanese';
  const currentAbilityStatus = currentItem?.step
    ? japaneseAbilityStatusFor(curriculumUnitStates(w, d, currentItem.step.id))
    : 'not-started';
  const [editing, setEditing] = useState(false),
    [edit, setEdit] = useState(d),
    [record, setRecord] = useState(false),
    [correction, setCorrection] = useState<string>(),
    [unitForm, setUnitForm] = useState<{
      unitId?: string;
      name: string;
      scope: string;
      gap: string;
      endCondition: string;
    }>(),
    [actionForm, setActionForm] = useState<{
      title: string;
      start: string;
      endCondition: string;
      source: string;
      basis: string;
    }>(),
    [ref, setRef] = useState<Partial<Reference>>(),
    [vault, setVault] = useState(''),
    [noteFile, setNoteFile] = useState(''),
    [copyPreview, setCopyPreview] = useState(''),
    [complete, setComplete] = useState(false);
  const references = w.references
      .filter(
        (r) => r.directionId === d.id && (!r.unitId || r.unitId === u?.id),
      )
      .sort((a, b) => Number(b.primary) - Number(a.primary)),
    proposals = suggestions(w, d);
  const patch = (data: Record<string, unknown>) =>
    actions.run('learning.direction.update', { directionId: d.id, ...data });
  return (
    <>
      <div className="page-heading">
        <div>
          <button
            className="text-link"
            onClick={() => actions.navigate('routes')}
          >
            学习方向 / {statuses[d.status]}
          </button>
          <h1>{d.name}</h1>
          <p>{d.goal || '当前阶段目标可以稍后补充'}</p>
        </div>
        <div className="button-row">
          <Button
            variant="outline"
            onClick={() => {
              setEdit(d);
              setEditing(true);
            }}
          >
            编辑方向
          </Button>
          <Button
            variant="ghost"
            aria-label="置顶方向"
            disabled={actions.busy}
            onClick={() => void patch({ pinned: !d.pinned })}
          >
            <Pin />
            {d.pinned ? '取消置顶' : '置顶'}
          </Button>
        </div>
      </div>
      {japanese && <JapaneseDashboard state={state} d={d} />}
      <section className="content-panel learning-context">
        <div className="lesson-header">
          <div>
            <span className="eyebrow">这次从这里继续</span>
            <h2>
              {currentItem?.step?.title ??
                u?.name ??
                (d.curriculumId
                  ? '从下方路线选择你正在学的一节'
                  : '还没有当前单元')}
            </h2>
          </div>
          {u && lessonCompletion && (
            <span
              className={
                'lesson-status' +
                (lessonCompletion.complete ? ' is-complete' : '')
              }
            >
              {japanese
                ? abilityStatusLabels[currentAbilityStatus]
                : lessonCompletion.complete
                  ? '本节已完成'
                  : lessonCompletion.total > 1 && lessonCompletion.done > 0
                    ? '已完成 ' +
                      lessonCompletion.done +
                      '/' +
                      lessonCompletion.total
                    : u.contact === 'seen'
                      ? '学习中'
                      : '未接触'}
            </span>
          )}
        </div>
        {!u?.curriculumItemId && (
          <p className="lesson-intro">
            {u?.scope ||
              d.scope ||
              (d.curriculumId
                ? '路线已编入，可以直接从已有进度继续。'
                : '可以只添加当前正在学的一小段内容。')}
          </p>
        )}
        <CurrentCurriculumLesson state={state} d={d} />
        {u && lessonCompletion && !japanese && (
          <section className="lesson-completion" aria-label="本节完成进度">
            <div className="lesson-completion-heading">
              <div>
                <h3>完成进度</h3>
                <p>
                  {lessonCompletion.total > 1
                    ? '四项分别记录，全部完成后本节才算完成。'
                    : '完成后仍可继续补记学习结果。'}
                </p>
              </div>
              {lessonCompletion.total > 1 && (
                <span>
                  {lessonCompletion.done}/{lessonCompletion.total}
                </span>
              )}
            </div>
            <fieldset className="lesson-completion-actions">
              <legend className="sr-only">本节完成项</legend>
              {lessonCompletion.parts.map((part) => {
                const isDone = u.completionParts?.includes(part) ?? false;
                const label =
                  part === 'lesson'
                    ? isDone
                      ? '本节已完成'
                      : '完成本节'
                    : completionLabels[part] + (isDone ? '已完成' : '完成');
                return (
                  <Button
                    key={part}
                    size="sm"
                    variant={isDone ? 'secondary' : 'outline'}
                    className={isDone ? 'is-complete' : undefined}
                    aria-pressed={isDone}
                    title={isDone ? '再次点击可取消这一完成项' : undefined}
                    disabled={actions.busy}
                    onClick={() =>
                      void actions.run('learning.unit.completion', {
                        directionId: d.id,
                        unitId: u.id,
                        part,
                        completed: !isDone,
                      })
                    }
                  >
                    {isDone && <Check size={14} />}
                    {label}
                  </Button>
                );
              })}
            </fieldset>
            <p className="lesson-completion-note">
              完成进度独立保存，不会自动改变掌握判断。
            </p>
          </section>
        )}
        {japanese && currentItem?.step && (
          <section className="lesson-completion japanese-current-ability">
            <div className="lesson-completion-heading">
              <div>
                <h3>当前能力状态</h3>
                <p>状态用于监控实际能力，不会改变 IRODORI 的学习顺序。</p>
              </div>
              <span>{abilityStatusLabels[currentAbilityStatus]}</span>
            </div>
            <JapaneseAbilityEditor
              state={state}
              d={d}
              itemId={currentItem.step.id}
              actions={actions}
            />
          </section>
        )}
        {u && !japanese && (
          <section className="lesson-state-section">
            <h3 className="lesson-subheading">学习状态</h3>
            <div className="lesson-state-grid">
              {d.kind !== 'reading' && (
                <article className="lesson-state-card">
                  <span>当前判断</span>
                  <strong>{masteryLabels[u.mastery]}</strong>
                  <p>
                    {u.evidenceType
                      ? evidenceLabels[u.evidenceType]
                      : u.mastery === 'unknown'
                        ? '目前掌握情况尚不清楚'
                        : '尚未补充判断依据'}
                  </p>
                </article>
              )}
              <article className="lesson-state-card">
                <span>上次停点</span>
                <strong>
                  {w.records
                    .filter((r) => r.directionId === d.id && r.result)
                    .at(-1)?.result || '尚未记录'}
                </strong>
              </article>
              <article className="lesson-state-card">
                <span>{d.kind === 'reading' ? '正在思考' : '当前卡点'}</span>
                <strong>{u.blocker || '尚未记录'}</strong>
              </article>
            </div>
            {u.evidence && <p className="hint">最近依据：{u.evidence}</p>}
          </section>
        )}
        {!japanese && (
          <section className="lesson-next-section">
            <h3 className="lesson-subheading">已保存的下一步</h3>
            <div className="next-step">
              <p>{a?.title ?? '下一步尚未确定'}</p>
              {a?.start && <span>开始位置：{a.start}</span>}
              {a?.endCondition && <span>结束条件：{a.endCondition}</span>}
              {a?.unitId && a.unitId !== d.currentUnitId && (
                <small>
                  这条下一步来自「
                  {units.find((unit) => unit.id === a.unitId)?.name ??
                    '之前的单元'}
                  」，可以按当前小节调整。
                </small>
              )}
              {last?.nextMode === 'keep' && (
                <small>上次记录尚未更新下一步，保留原有内容</small>
              )}
            </div>
          </section>
        )}
        {!japanese && (
          <div className="button-row lesson-actions">
            <Button
              onClick={() => {
                setCorrection(undefined);
                setRecord(true);
              }}
            >
              开始／继续本次学习
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setActionForm({
                  title: a?.title ?? '',
                  start: a?.start ?? '',
                  endCondition: a?.endCondition ?? '',
                  source: 'manual',
                  basis: '',
                })
              }
            >
              调整下一步
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const text = copyActionText(
                  w,
                  d,
                  location.href,
                  state.materials,
                );
                setCopyPreview(text);
                void copy(text, actions);
              }}
            >
              <Copy />
              复制学习行动
            </Button>
          </div>
        )}
        <p className="hint lesson-action-note">
          {japanese
            ? '学习结束后更新能力状态；只有遇到明显问题时，再补充薄弱点或掌握证据。'
            : '学习结束后，用“开始／继续本次学习”补记停点、掌握判断和下一步。'}
        </p>
        {copyPreview && (
          <details open>
            <summary>行动摘要（可手动复制到序流）</summary>
            <pre className="copy-preview">{copyPreview}</pre>
          </details>
        )}
      </section>{' '}
      {proposals.length > 0 && (
        <section className="content-panel rule-suggestion">
          <h2>一个可选起点</h2>
          <p>{proposals[0].title}</p>
          <p className="hint">
            依据：{proposals[0].basis} · 规则建议，尚未采用
          </p>
          <Button
            variant="outline"
            onClick={() => setActionForm({ ...proposals[0], source: 'rule' })}
          >
            查看并确认建议
          </Button>
        </section>
      )}
      <CurriculumRoute
        state={state}
        d={d}
        actions={actions}
        onRecord={() => {
          setCorrection(undefined);
          setRecord(true);
        }}
      />
      <section className="content-panel learning-section">
        <div className="section-heading">
          <h2>
            {d.curriculumId ? '自己的补充单元' : '简短路线'} ·{' '}
            {personalUnits.filter((u) => !u.archived).length} 个单元
          </h2>
          <Button
            variant="outline"
            onClick={() =>
              setUnitForm({ name: '', scope: '', gap: '', endCondition: '' })
            }
          >
            <Plus />
            {personalUnits.length || d.curriculumId
              ? '添加单元'
              : '写下当前内容'}
          </Button>
        </div>
        {!personalUnits.length && (
          <p>
            {d.curriculumId
              ? '课堂任务、项目或额外阅读可以补充在这里。'
              : '先写当前正在学的内容，不需要整理整本教材。'}
          </p>
        )}
        {personalUnits
          .filter((x) => !x.archived)
          .map((unit, i, visible) => (
            <article
              className={
                'unit-row ' + (u?.id === unit.id ? 'current-unit' : '')
              }
              key={unit.id}
            >
              <div>
                <strong>{unit.name}</strong>
                <p className="hint">
                  {u?.id === unit.id ? '当前单元 · ' : ''}
                  {unit.contact === 'seen' ? '已接触' : '未接触'}
                  {d.kind !== 'reading'
                    ? ' · ' + masteryLabels[unit.mastery]
                    : ''}
                </p>
                {unit.origin === 'legacy-route' && (
                  <small>来自已选择的旧路线，实际学习位置尚需自行确认</small>
                )}
              </div>
              <div className="button-row">
                <Button
                  variant="ghost"
                  disabled={actions.busy || u?.id === unit.id}
                  onClick={() => void patch({ currentUnitId: unit.id })}
                >
                  设为当前
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setUnitForm({
                      unitId: unit.id,
                      name: unit.name,
                      scope: unit.scope,
                      gap: unit.gap,
                      endCondition: unit.endCondition,
                    })
                  }
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  aria-label={'上移单元 ' + unit.name}
                  disabled={actions.busy || i === 0}
                  onClick={() =>
                    void actions.run('learning.unit.move', {
                      directionId: d.id,
                      unitId: unit.id,
                      delta: 'up',
                    })
                  }
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  aria-label={'下移单元 ' + unit.name}
                  disabled={actions.busy || i === visible.length - 1}
                  onClick={() =>
                    void actions.run('learning.unit.move', {
                      directionId: d.id,
                      unitId: unit.id,
                      delta: 'down',
                    })
                  }
                >
                  ↓
                </Button>
              </div>
            </article>
          ))}
      </section>
      <section className="content-panel learning-section">
        <div className="section-heading">
          <h2>材料与笔记入口</h2>
          <Button
            variant="outline"
            onClick={() =>
              setRef({
                kind: 'web',
                name: '',
                target: '',
                location: '',
                purpose: '',
                unitId: u?.id,
                primary: !references.some((r) => r.primary),
              })
            }
          >
            <Link2 />
            关联入口
          </Button>
        </div>
        {references.length ? (
          references.map((r) => (
            <ReferenceEntry
              key={r.id}
              reference={r}
              material={state.materials.find((m) => m.id === r.target)}
              actions={actions}
              onEdit={() => setRef(r)}
            />
          ))
        ) : (
          <p>
            可关联已有附件、网页、教材位置、本地路径或笔记。没有材料也能学习。
          </p>
        )}
        {d.id === 'development' && (
          <PdfOpenButton
            resource={{ kind: 'development-plan' }}
            title="开发学习方案 ver2"
            label="开发学习方案 ver2 原件"
          />
        )}
        <Button variant="ghost" onClick={() => actions.navigate('materials')}>
          查看全部资料与上传状态
        </Button>
      </section>
      <section className="content-panel learning-section">
        <div className="section-heading">
          <h2>最近记录</h2>
          <Button variant="ghost" onClick={() => actions.navigate('progress')}>
            学习回看
          </Button>
        </div>
        {last ? (
          <>
            <p>{last.result || '本次记录了状态或下一步调整'}</p>
            <small>
              {stamp(last.createdAt)} · {last.directionName} /{' '}
              {last.unitName || '未关联单元'}
            </small>
            <div>
              <Button
                variant="ghost"
                onClick={() => {
                  setCorrection(last.id);
                  setRecord(true);
                }}
              >
                修正最近记录
              </Button>
            </div>
          </>
        ) : (
          <p>还没有记录。学习后留下一句话，下次就能接上。</p>
        )}
      </section>
      <details className="learning-section">
        <summary>方向状态与更多信息</summary>
        <p>{d.scope || '尚未填写当前课程范围'}</p>
        <p>
          {d.endCondition
            ? '阶段结束条件：' + d.endCondition
            : '阶段结束条件可选填'}
        </p>
        <div className="button-row">
          <Button
            variant="outline"
            disabled={actions.busy}
            onClick={() =>
              void patch({
                status: d.status === 'active' ? 'paused' : 'active',
              })
            }
          >
            {d.status === 'active' ? '暂停方向' : '恢复方向'}
          </Button>
          <Button
            variant="outline"
            disabled={actions.busy || d.status === 'completed'}
            onClick={() => setComplete(true)}
          >
            标记方向完成
          </Button>
          <Button
            variant="ghost"
            disabled={actions.busy || d.status === 'archived'}
            onClick={() => void patch({ status: 'archived' })}
          >
            归档方向
          </Button>
        </div>
        <p className="hint">暂停、完成或归档会保留记录、路线、材料和下一步。</p>
      </details>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>编辑学习方向</DialogTitle>
            <DialogDescription>
              只需名称；其他内容可逐步补充。
            </DialogDescription>
          </DialogHeader>
          <div className="learning-form">
            <Field label="方向名称">
              <Input
                aria-label="编辑方向名称"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Choice
              label="方向类型"
              value={edit.kind}
              onChange={(kind) =>
                setEdit({ ...edit, kind: kind as Direction['kind'] })
              }
              options={[
                option('course', '课程'),
                option('skill', '技能'),
                option('reading', '阅读与探索'),
              ]}
            />
            {(['goal', 'scope', 'endCondition'] as const).map((key, i) => (
              <Field
                key={key}
                label={['当前阶段目标', '当前课程范围', '阶段结束条件'][i]}
              >
                <Textarea
                  aria-label={
                    ['当前阶段目标', '当前课程范围', '阶段结束条件'][i]
                  }
                  value={edit[key]}
                  onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                />
              </Field>
            ))}
            <Button
              disabled={actions.busy || !edit.name.trim()}
              onClick={async () => {
                if (
                  await patch({
                    name: edit.name,
                    kind: edit.kind,
                    goal: edit.goal,
                    scope: edit.scope,
                    endCondition: edit.endCondition,
                  })
                )
                  setEditing(false);
              }}
            >
              保存方向
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!unitForm}
        onOpenChange={(v) => !v && setUnitForm(undefined)}
      >
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>
              {unitForm?.unitId ? '编辑单元' : '添加学习单元'}
            </DialogTitle>
            <DialogDescription>
              排序和改名保留原有记录及关联。
            </DialogDescription>
          </DialogHeader>
          {unitForm && (
            <div className="learning-form">
              {(['name', 'scope', 'gap', 'endCondition'] as const).map(
                (key, i) => (
                  <Field
                    key={key}
                    label={
                      [
                        '单元名称',
                        '材料或范围说明',
                        '已确认的前置缺口（选填）',
                        '单元结束条件（选填）',
                      ][i]
                    }
                  >
                    <Input
                      aria-label={
                        [
                          '单元名称',
                          '材料或范围说明',
                          '已确认的前置缺口',
                          '单元结束条件',
                        ][i]
                      }
                      value={unitForm[key]}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, [key]: e.target.value })
                      }
                    />
                  </Field>
                ),
              )}
              <Button
                disabled={actions.busy || !unitForm.name.trim()}
                onClick={async () => {
                  if (
                    await actions.run('learning.unit.save', {
                      directionId: d.id,
                      ...unitForm,
                    })
                  )
                    setUnitForm(undefined);
                }}
              >
                保存单元
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!actionForm}
        onOpenChange={(v) => !v && setActionForm(undefined)}
      >
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>确认下一步</DialogTitle>
            <DialogDescription>
              写明从哪里开始、做什么、做到哪里结束。不设置日期或每日额度。
            </DialogDescription>
          </DialogHeader>
          {actionForm && (
            <div className="learning-form">
              {actionForm.basis && (
                <p className="hint">依据：{actionForm.basis}</p>
              )}
              {(['title', 'start', 'endCondition'] as const).map((key, i) => (
                <Field
                  key={key}
                  label={['下一步具体动作', '开始位置', '这次结束条件'][i]}
                >
                  <Textarea
                    aria-label={
                      ['下一步具体动作', '开始位置', '这次结束条件'][i]
                    }
                    value={actionForm[key]}
                    onChange={(e) =>
                      setActionForm({
                        ...actionForm,
                        [key]: e.target.value,
                        source: 'manual',
                      })
                    }
                  />
                </Field>
              ))}
              {actionForm.title.length < 10 && (
                <p className="hint">
                  可以补充一个具体起点和结束条件；也允许先保存粗略想法。
                </p>
              )}
              <div className="button-row">
                <Button
                  disabled={actions.busy || !actionForm.title.trim()}
                  onClick={async () => {
                    if (
                      await actions.run('learning.action.save', {
                        directionId: d.id,
                        ...actionForm,
                      })
                    )
                      setActionForm(undefined);
                  }}
                >
                  确认保存下一步
                </Button>
                <Button
                  variant="ghost"
                  disabled={actions.busy}
                  onClick={async () => {
                    if (
                      await actions.run('learning.action.save', {
                        directionId: d.id,
                        clear: true,
                      })
                    )
                      setActionForm(undefined);
                  }}
                >
                  明确暂不设置
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={record} onOpenChange={setRecord}>
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>记录与接续</DialogTitle>
            <DialogDescription>
              结果、判断、下一步不必全部填写。输入草稿保留在当前浏览器。
            </DialogDescription>
          </DialogHeader>
          {record && (
            <RecordForm
              d={d}
              u={u}
              w={w}
              actions={actions}
              correction={correction}
              onDone={() => setRecord(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!ref} onOpenChange={(v) => !v && setRef(undefined)}>
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>关联材料或笔记</DialogTitle>
            <DialogDescription>
              保存入口和用途，不移动原文件，也不读取笔记正文。
            </DialogDescription>
          </DialogHeader>
          {ref && (
            <div className="learning-form">
              <Choice
                label="入口类型"
                value={ref.kind ?? 'web'}
                onChange={(kind) =>
                  setRef({
                    ...ref,
                    kind: kind as Reference['kind'],
                    target: '',
                  })
                }
                options={[
                  option('web', '网页'),
                  option('attachment', '资料库已有附件'),
                  option('location', '教材名称与位置'),
                  option('local', '本地路径（只复制）'),
                  option('note', '笔记链接或相对路径'),
                ]}
              />
              <Field label="入口名称">
                <Input
                  aria-label="入口名称"
                  value={ref.name ?? ''}
                  onChange={(e) => setRef({ ...ref, name: e.target.value })}
                />
              </Field>
              {ref.kind === 'attachment' ? (
                <Choice
                  label="选择附件"
                  value={ref.target ?? ''}
                  onChange={(target) =>
                    setRef({
                      ...ref,
                      target,
                      name:
                        state.materials.find((m) => m.id === target)?.name ??
                        ref.name,
                    })
                  }
                  options={[
                    option('', '请选择已有附件'),
                    ...state.materials
                      .filter((m) => !m.url)
                      .map((m) => option(m.id, m.name)),
                  ]}
                />
              ) : (
                <Field label="地址或路径">
                  <Input
                    aria-label="地址或路径"
                    value={ref.target ?? ''}
                    onChange={(e) => setRef({ ...ref, target: e.target.value })}
                  />
                </Field>
              )}
              {ref.kind === 'note' && (
                <details>
                  <summary>生成 Obsidian 打开链接</summary>
                  <Field label="笔记库名称">
                    <Input
                      aria-label="笔记库名称"
                      value={vault}
                      onChange={(e) => setVault(e.target.value)}
                    />
                  </Field>
                  <Field label="笔记库内路径">
                    <Input
                      aria-label="笔记库内路径"
                      value={noteFile}
                      onChange={(e) => setNoteFile(e.target.value)}
                    />
                  </Field>
                  <Button
                    variant="outline"
                    disabled={!vault || !noteFile}
                    onClick={() =>
                      setRef({ ...ref, target: obsidianLink(vault, noteFile) })
                    }
                  >
                    填入打开链接
                  </Button>
                  <p className="hint">
                    中文、空格与特殊字符会编码。本机打不开时可复制入口。
                  </p>
                </details>
              )}
              <Choice
                label="关联位置"
                value={ref.unitId ?? ''}
                onChange={(unitId) =>
                  setRef({ ...ref, unitId: unitId || undefined })
                }
                options={[
                  option('', '整个方向'),
                  ...units.map((u) => option(u.id, u.name)),
                ]}
              />
              {(['location', 'purpose'] as const).map((key, i) => (
                <Field key={key} label={['位置说明', '用于做什么'][i]}>
                  <Input
                    aria-label={['位置说明', '用于做什么'][i]}
                    value={ref[key] ?? ''}
                    onChange={(e) => setRef({ ...ref, [key]: e.target.value })}
                  />
                </Field>
              ))}
              {ref.kind !== 'note' && (
                <label>
                  <input
                    type="checkbox"
                    checked={ref.primary ?? false}
                    onChange={(e) =>
                      setRef({ ...ref, primary: e.target.checked })
                    }
                  />{' '}
                  作为这一位置的主材料
                </label>
              )}
              <Button
                disabled={actions.busy || !ref.name?.trim()}
                onClick={async () => {
                  if (
                    await actions.run('learning.reference.save', {
                      ...ref,
                      referenceId: ref.id,
                      directionId: d.id,
                    })
                  )
                    setRef(undefined);
                }}
              >
                保存入口
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={complete} onOpenChange={setComplete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认这个方向已完成？</DialogTitle>
            <DialogDescription>
              这是你对阶段成果的确认。路线被点击过不会自动判定完成，历史仍保留。
            </DialogDescription>
          </DialogHeader>
          <Button
            disabled={actions.busy}
            onClick={async () => {
              if (await patch({ status: 'completed', confirm: true }))
                setComplete(false);
            }}
          >
            确认完成方向
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LearningReview({ state, actions, open }: Props) {
  const w = state.learning!,
    [direction, setDirection] = useState(''),
    [unit, setUnit] = useState('');
  const rows = w.records
    .filter(
      (r) =>
        (!direction || r.directionId === direction) &&
        (!unit || r.unitId === unit),
    )
    .toReversed();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>学习回看</h1>
          <p>看见发生过什么，以及还没解决的问题。</p>
        </div>
        <Button variant="outline" onClick={() => actions.navigate('legacy')}>
          查看旧记录与计划
        </Button>
      </div>
      <div className="review-filters">
        <Choice
          label="筛选学习方向"
          value={direction}
          onChange={(id) => {
            setDirection(id);
            setUnit('');
          }}
          options={[
            option('', '全部方向'),
            ...w.directions.map((d) => option(d.id, d.name)),
          ]}
        />
        <Choice
          label="筛选学习单元"
          value={unit}
          onChange={setUnit}
          options={[
            option('', '全部单元'),
            ...w.units
              .filter((u) => !direction || u.directionId === direction)
              .map((u) => option(u.id, u.name)),
          ]}
        />
      </div>
      <section className="content-panel">
        <h2>尚未解决的卡点</h2>
        {w.units
          .filter(
            (u) =>
              u.blocker &&
              (!direction || u.directionId === direction) &&
              (!unit || u.id === unit),
          )
          .map((u) => (
            <div className="direction-row" key={u.id}>
              <div>
                <strong>{u.name}</strong>
                <p>{u.blocker}</p>
              </div>
              <Button variant="ghost" onClick={() => open(u.directionId)}>
                回到方向
              </Button>
            </div>
          ))}
        {!w.units.some(
          (u) =>
            u.blocker &&
            (!direction || u.directionId === direction) &&
            (!unit || u.id === unit),
        ) && <p>此范围内尚未记录卡点。</p>}
      </section>
      <section className="content-panel learning-section">
        <h2>学习记录 · {rows.length}</h2>
        {!rows.length && (
          <p>
            还没有这个范围内的学习记录。旧任务与反馈在“旧记录与计划”中完整保留。
          </p>
        )}
        {rows.map((r) => (
          <article key={r.id} className="record-row">
            <div className="section-heading">
              <strong>
                {r.directionName} / {r.unitName || '未关联单元'}
              </strong>
              <small>{stamp(r.createdAt)}</small>
            </div>
            {r.correctsId && <small>修正记录 · 原记录保留供对照</small>}
            {w.records.some((x) => x.correctsId === r.id) && (
              <p className="hint">这条记录已有修正，请以上方后续修正为准。</p>
            )}
            <p>{r.result || '记录了状态或接续调整'}</p>
            {r.contact && (
              <span>{r.contact === 'seen' ? '已接触' : '未接触'} · </span>
            )}
            {r.mastery && (
              <span>
                {masteryLabels[r.mastery]} ·{' '}
                {r.evidenceType ? evidenceLabels[r.evidenceType] : '用户自评'}
              </span>
            )}
            {r.evidence && <p>依据：{r.evidence}</p>}
            {r.blocker !== undefined && (
              <p>卡点：{r.blocker || '用户确认已清除'}</p>
            )}
            <p className="hint">
              {r.nextMode === 'keep'
                ? '下一步尚未更新，保留原有内容'
                : r.nextMode === 'clear'
                  ? '明确暂不设置下一步'
                  : '已保存新下一步'}
              {r.nextAction ? '：' + r.nextAction.title : ''}
            </p>
            <Button variant="ghost" onClick={() => open(r.directionId)}>
              回到方向
            </Button>
          </article>
        ))}
      </section>
    </>
  );
}
export function LegacyView({
  state,
  actions,
}: Pick<Props, 'state' | 'actions'>) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>旧记录与计划</h1>
          <p>原始内容保留供查看与导出，不参与新版掌握判断或时间安排。</p>
        </div>
        <a
          className="resource-open"
          href="/api/history?export=1"
          download="学迹学习数据ver1.json"
        >
          导出全部学习状态
        </a>
      </div>
      <section className="content-panel">
        <h2>待关联历史任务 · {state.tasks.length}</h2>
        <p className="hint">
          没有可靠单元对应关系的任务保留在这里；完成只表示历史执行信息。
        </p>
        {state.tasks.map((t) => (
          <details key={t.id}>
            <summary>
              {t.date} · {t.title} ·{' '}
              {t.source === 'demo' ? '演示任务' : t.status}
            </summary>
            <pre className="copy-preview">{JSON.stringify(t, null, 2)}</pre>
          </details>
        ))}
        {!state.tasks.length && <p>没有旧任务记录。</p>}
      </section>
      <section className="content-panel learning-section">
        <h2>旧课程档案与计划 · {state.subjects.length}</h2>
        {state.subjects.map((s) => (
          <details key={s.id}>
            <summary>
              {s.name} · {s.plans.length} 份旧方案
            </summary>
            <pre className="copy-preview">{JSON.stringify(s, null, 2)}</pre>
          </details>
        ))}
      </section>
      <section className="content-panel learning-section">
        <h2>旧课表、时间设置与日志</h2>
        <details>
          <summary>
            课表 {state.timetable.length} 条；临时时间记录{' '}
            {state.overrides.length} 条
          </summary>
          <pre className="copy-preview">
            {JSON.stringify(
              {
                timetable: state.timetable,
                overrides: state.overrides,
                settings: state.settings,
              },
              null,
              2,
            )}
          </pre>
        </details>
        <details>
          <summary>旧日志 {state.logs.length} 条</summary>
          <pre className="copy-preview">
            {JSON.stringify(state.logs, null, 2)}
          </pre>
        </details>
        <Button variant="outline" onClick={() => actions.navigate('materials')}>
          查看旧附件与资料
        </Button>
        <p className="hint">
          导出包含状态、旧记录及附件清单；不包含附件本体、资料全文或密钥。
        </p>
      </section>
    </>
  );
}
