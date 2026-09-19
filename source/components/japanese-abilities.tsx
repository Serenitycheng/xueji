'use client';

import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Field } from './ui-parts';
import type { Actions } from './study-app';
import type { StudyState } from '@/lib/model';
import {
  abilityStatusLabels,
  japaneseAbilityStatuses,
  japaneseAbilityStatusFor,
  type Direction,
} from '@/lib/learning';
import {
  curriculumSourceHref,
  curriculumSteps,
  curriculumUnitStates,
  currentCurriculumItem,
  getCurriculum,
  resolveCurriculumSource,
} from '@/lib/curriculum';

type AbilityProps = {
  state: StudyState;
  d: Direction;
  itemId: string;
  actions: Actions;
};

export function JapaneseAbilityEditor({
  state,
  d,
  itemId,
  actions,
}: AbilityProps) {
  const units = curriculumUnitStates(state.learning!, d, itemId);
  const status = japaneseAbilityStatusFor(units);
  const saved =
    units
      .filter((unit) => unit.abilityStatus)
      .toSorted((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .at(-1) ?? units.at(-1);
  const [weakPoint, setWeakPoint] = useState(saved?.blocker ?? '');
  const [evidence, setEvidence] = useState(saved?.evidence ?? '');
  const update = (values: Record<string, unknown>) =>
    actions.run('learning.ability.update', {
      directionId: d.id,
      itemId,
      status,
      ...values,
    });
  return (
    <div className="japanese-ability-editor">
      <fieldset className="japanese-status-actions">
        <legend>掌握状态</legend>
        {japaneseAbilityStatuses.map((option) => {
          const selected = option.id === status;
          return (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={selected ? 'secondary' : 'outline'}
              className={selected ? 'is-selected' : undefined}
              aria-pressed={selected}
              disabled={actions.busy}
              onClick={() =>
                void actions.run('learning.ability.update', {
                  directionId: d.id,
                  itemId,
                  status: option.id,
                })
              }
            >
              {selected && <Check size={14} />}
              {option.label}
            </Button>
          );
        })}
      </fieldset>
      <details className="japanese-ability-notes">
        <summary>薄弱点与掌握证据（选填）</summary>
        <div className="japanese-ability-note-fields">
          <Field label="当前薄弱点">
            <Textarea
              aria-label="当前薄弱点"
              rows={2}
              value={weakPoint}
              maxLength={1000}
              placeholder="例如：听力反应慢；留空表示暂无"
              onChange={(event) => setWeakPoint(event.target.value)}
            />
          </Field>
          <Field label="掌握证据">
            <Textarea
              aria-label="掌握证据"
              rows={2}
              value={evidence}
              maxLength={1000}
              placeholder="例如：能不看文本完成约30秒表达"
              onChange={(event) => setEvidence(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            disabled={actions.busy}
            onClick={() => void update({ blocker: weakPoint, evidence })}
          >
            保存补充信息
          </Button>
        </div>
      </details>
    </div>
  );
}

export function JapaneseDashboard({
  state,
  d,
}: Pick<AbilityProps, 'state' | 'd'>) {
  const curriculum = getCurriculum('japanese');
  if (!curriculum) return null;
  const all = curriculumSteps(curriculum);
  const current = currentCurriculumItem(state.learning!, d);
  const currentIndex = current
    ? all.findIndex(({ step }) => step.id === current.id)
    : -1;
  const currentStep = current?.step;
  const currentStatus = currentStep
    ? japaneseAbilityStatusFor(
        curriculumUnitStates(state.learning!, d, currentStep.id),
      )
    : 'not-started';
  const next =
    currentIndex >= 0 && ['basic', 'fluent'].includes(currentStatus)
      ? all[currentIndex + 1]
      : currentIndex >= 0
        ? all[currentIndex]
        : all[0];
  const primarySource = currentStep?.sources
    .map((source) => resolveCurriculumSource(source, state.materials))
    .map((source) => ({ source, href: curriculumSourceHref(source) }))
    .find((entry) => entry.href);
  const weakPoints = all.flatMap(({ step }) => {
    const unit = curriculumUnitStates(state.learning!, d, step.id)
      .filter((value) => value.blocker)
      .toSorted((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .at(-1);
    return unit?.blocker ? [{ title: step.title, text: unit.blocker }] : [];
  });
  const statuses = all.map(({ step }) =>
    japaneseAbilityStatusFor(curriculumUnitStates(state.learning!, d, step.id)),
  );
  const statusCounts = Object.fromEntries(
    japaneseAbilityStatuses.map((option) => [
      option.id,
      statuses.filter((value) => value === option.id).length,
    ]),
  ) as Record<(typeof japaneseAbilityStatuses)[number]['id'], number>;
  const currentCourseSteps = currentStep
    ? all.filter(({ step }) => step.course === currentStep.course)
    : [];
  const courseLessons = [
    ...new Set(
      currentCourseSteps
        .map(({ step }) => step.lesson)
        .filter(
          (lesson): lesson is string => !!lesson && /^Lesson \d+$/.test(lesson),
        ),
    ),
  ];
  const sameLesson = currentStep
    ? currentCourseSteps.filter(
        ({ step }) => step.lesson === currentStep.lesson,
      )
    : [];
  const currentLessonAbilityIndex = currentStep
    ? sameLesson.findIndex(({ step }) => step.id === currentStep.id)
    : -1;
  const currentCategoryStatuses = current?.unit?.steps.map((step) =>
    japaneseAbilityStatusFor(curriculumUnitStates(state.learning!, d, step.id)),
  );
  const currentCategoryMastered = currentCategoryStatuses?.filter((value) =>
    ['basic', 'fluent'].includes(value),
  ).length;
  return (
    <section className="japanese-dashboard" aria-label="日语能力监控">
      <article className="japanese-route-card">
        <div>
          <span className="eyebrow">当前学习路线</span>
          <h2>{currentStep?.course ?? 'IRODORI Starter A1'}</h2>
        </div>
        {currentStep ? (
          <dl>
            <div>
              <dt>课程进度</dt>
              <dd>
                {currentStep.lesson}
                {currentStep.lesson &&
                courseLessons.includes(currentStep.lesson)
                  ? ` / ${courseLessons.length}`
                  : ''}
                {sameLesson.length > 1 && currentLessonAbilityIndex >= 0
                  ? ` · 本课能力 ${currentLessonAbilityIndex + 1}/${sameLesson.length}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>当前内容</dt>
              <dd>
                {currentStep.canDos?.length
                  ? currentStep.canDos
                      .map((code) => `Can-do ${code}`)
                      .join(' / ')
                  : '文字与发音准备'}
                {' · '}
                {currentStep.title}
              </dd>
            </div>
            <div>
              <dt>{next?.step.id === currentStep.id ? '继续' : '下一步'}</dt>
              <dd>
                {next
                  ? `${next.step.lesson ?? ''} · ${next.step.title}`
                  : '本路线已到最后一个能力节点'}
              </dd>
            </div>
          </dl>
        ) : (
          <p>从下方能力节点中选择当前 IRODORI 位置。</p>
        )}
        {primarySource?.href && (
          <a
            className="japanese-continue"
            href={primarySource.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            继续学习
            <ArrowUpRight size={16} />
          </a>
        )}
      </article>
      <section className="japanese-overview-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">能力概览</span>
            <h2>现在已经会什么</h2>
          </div>
          <span>{all.length} 个能力节点</span>
        </div>
        <div className="japanese-status-summary" aria-label="日语能力状态汇总">
          {japaneseAbilityStatuses.map((option) => (
            <div key={option.id}>
              <strong>{statusCounts[option.id]}</strong>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
        {current?.unit && currentCategoryStatuses && (
          <div className="japanese-current-category">
            <div>
              <strong>当前分类：{current.unit.title}</strong>
              <span>
                已掌握 {currentCategoryMastered}/
                {currentCategoryStatuses.length}
              </span>
            </div>
            <progress
              aria-label={`${current.unit.title}能力进度`}
              value={currentCategoryMastered}
              max={currentCategoryStatuses.length}
            />
          </div>
        )}
        <details className="japanese-overview-details">
          <summary>查看全部 {curriculum.units.length} 个能力分类</summary>
          <div className="japanese-category-grid">
            {curriculum.units.map((unit) => {
              const categoryStatuses = unit.steps.map((step) =>
                japaneseAbilityStatusFor(
                  curriculumUnitStates(state.learning!, d, step.id),
                ),
              );
              const fluent = categoryStatuses.filter(
                (value) => value === 'fluent',
              ).length;
              const basic = categoryStatuses.filter(
                (value) => value === 'basic',
              ).length;
              const learning = categoryStatuses.filter(
                (value) => value === 'learning',
              ).length;
              return (
                <article key={unit.id}>
                  <div>
                    <strong>{unit.title}</strong>
                    <span>
                      熟练 {fluent} · 基本掌握 {basic} · 学习中 {learning}
                    </span>
                  </div>
                  <progress
                    aria-label={`${unit.title}能力进度`}
                    value={fluent + basic}
                    max={unit.steps.length}
                  />
                </article>
              );
            })}
          </div>
        </details>
      </section>
      <section className="japanese-weakness-card">
        <div>
          <span className="eyebrow">当前薄弱点</span>
          <h2>现在最需要补什么</h2>
        </div>
        {weakPoints.length ? (
          <ul>
            {weakPoints.map((point) => (
              <li key={`${point.title}:${point.text}`}>
                <strong>{point.title}</strong>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>尚未记录明显薄弱点；只在确实遇到问题时补充即可。</p>
        )}
      </section>
    </section>
  );
}

export function japaneseStatusText(
  state: StudyState,
  d: Direction,
  itemId: string,
) {
  return abilityStatusLabels[
    japaneseAbilityStatusFor(curriculumUnitStates(state.learning!, d, itemId))
  ];
}
