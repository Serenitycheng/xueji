'use client';

import { Check } from 'lucide-react';
import { Button } from './ui/button';
import type { Actions } from './study-app';

export function LessonCompletion({
  title,
  completed,
  directionId,
  itemId,
  unitId,
  actions,
}: {
  title: string;
  completed: boolean;
  directionId: string;
  itemId?: string;
  unitId?: string;
  actions: Actions;
}) {
  return (
    <Button
      size="sm"
      variant={completed ? 'secondary' : 'outline'}
      className="lesson-complete-toggle"
      aria-label={`${completed ? '取消完成' : '标记完成'}：${title}`}
      aria-pressed={completed}
      disabled={actions.busy}
      onClick={() =>
        void actions.run('learning.unit.completion', {
          directionId,
          ...(itemId ? { itemId } : { unitId }),
          completed: !completed,
        })
      }
    >
      {completed && <Check size={14} />}
      {completed ? '已完成' : '完成'}
    </Button>
  );
}
