'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { Check, Palette } from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from './ui/popover';
import {
  appearancePage,
  appearanceStorageKey,
  defaultPaperTone,
  emptyAppearance,
  isPaperColor,
  paperInk,
  paperTones,
  readAppearance,
} from '@/lib/appearance';

const changedEvent = 'xueji:appearance-change';
let sessionAppearance: string | undefined;
const AppearanceContext = createContext({
  color: defaultPaperTone,
  choose: (_color: string) => {},
});

function subscribeColors(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === appearanceStorageKey || event.key === null) {
      sessionAppearance = undefined;
      listener();
    }
  };
  window.addEventListener(changedEvent, listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(changedEvent, listener);
    window.removeEventListener('storage', storage);
  };
}
function storedColors() {
  if (sessionAppearance !== undefined) return sessionAppearance;
  try {
    return localStorage.getItem(appearanceStorageKey) ?? emptyAppearance;
  } catch {
    return emptyAppearance;
  }
}
function subscribePage(listener: () => void) {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}
const currentPage = () => appearancePage(location.pathname, location.hash);

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = useSyncExternalStore(
    subscribeColors,
    storedColors,
    () => emptyAppearance,
  );
  const page = useSyncExternalStore(subscribePage, currentPage, () => 'today');
  const colors = useMemo(() => readAppearance(raw), [raw]);
  const color = colors[page] ?? defaultPaperTone;
  useEffect(() => {
    document.documentElement.style.setProperty('--page-tone', color);
    document.documentElement.style.setProperty('--page-ink', paperInk(color));
  }, [color]);
  const choose = useCallback(
    (next: string) => {
      if (!isPaperColor(next)) return;
      const updated = JSON.stringify({
        version: 1,
        colors: {
          ...readAppearance(storedColors()),
          [page]: next.toLowerCase(),
        },
      });
      sessionAppearance = updated;
      try {
        localStorage.setItem(appearanceStorageKey, updated);
        sessionAppearance = undefined;
      } catch {
        /* The selection remains usable for this browser session. */
      }
      window.dispatchEvent(new Event(changedEvent));
    },
    [page],
  );
  const value = useMemo(() => ({ color, choose }), [color, choose]);
  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function PageColorPicker() {
  const { color, choose } = useContext(AppearanceContext);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="page-color-trigger"
            aria-label="页面颜色"
          />
        }
      >
        <Palette size={16} />
        <span>页面颜色</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="page-color-panel">
        <PopoverTitle>页面颜色</PopoverTitle>
        <PopoverDescription>
          为当前页面选一个颜色，会自动记住。
        </PopoverDescription>
        <fieldset className="paper-color-options" aria-label="预设页面颜色">
          {paperTones.map((tone) => (
            <button
              key={tone.color}
              type="button"
              aria-label={tone.name}
              title={tone.name}
              aria-pressed={color === tone.color}
              onClick={() => choose(tone.color)}
              style={{ background: tone.color }}
            >
              {color === tone.color && <Check size={15} />}
            </button>
          ))}
        </fieldset>
        <label className="paper-custom-color">
          <span>自定义颜色</span>
          <input
            type="color"
            aria-label="自定义页面颜色"
            value={color}
            onChange={(event) => choose(event.target.value)}
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}
