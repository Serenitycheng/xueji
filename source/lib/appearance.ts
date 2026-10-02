export const appearanceStorageKey = 'xueji-paper-colors-v1';
export const defaultPaperTone = '#80674d';
export const emptyAppearance = '{"version":1,"colors":{}}';
export const paperTones = [
  { name: '暖棕', color: defaultPaperTone },
  { name: '竹绿', color: '#718c7c' },
  { name: '雾蓝', color: '#657f91' },
  { name: '藤紫', color: '#80769a' },
  { name: '亚麻', color: '#8b7658' },
  { name: '玫瑰', color: '#8a6f7d' },
  { name: '青灰', color: '#738287' },
];

const pages = [
  'today',
  'routes',
  'materials',
  'progress',
  'settings',
  'cloud',
  'legacy',
  'login',
];
export function appearancePage(pathname: string, hash: string) {
  if (pathname === '/login') return 'login';
  const page = hash.replace(/^#/, '');
  if (page.startsWith('learn/')) {
    try {
      const id = decodeURIComponent(page.slice(6));
      if (id && id.length <= 160) return 'learn:' + id;
    } catch {
      /* An invalid link uses the default home color. */
    }
  }
  if (page === 'schedule') return 'legacy';
  return pages.includes(page) ? page : 'today';
}

export function isPaperColor(color: unknown): color is string {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
}

export function readAppearance(raw: string): Record<string, string> {
  try {
    const saved = JSON.parse(raw);
    if (
      saved?.version !== 1 ||
      !saved.colors ||
      typeof saved.colors !== 'object' ||
      Array.isArray(saved.colors)
    )
      return {};
    return Object.fromEntries(
      Object.entries(saved.colors)
        .filter(
          ([page, color]) =>
            (pages.includes(page) ||
              (page.startsWith('learn:') &&
                page.length > 6 &&
                page.length <= 166)) &&
            isPaperColor(color),
        )
        .slice(0, 200)
        .map(([page, color]) => [page, (color as string).toLowerCase()]),
    );
  } catch {
    return {};
  }
}

// Keep white labels readable, even when a custom color is very pale.
export function paperInk(color: string) {
  if (!isPaperColor(color)) return defaultPaperTone;
  let rgb = [1, 3, 5].map((start) =>
    parseInt(color.slice(start, start + 2), 16),
  );
  const luminance = () =>
    rgb
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  while (luminance() > 0.17) rgb = rgb.map((value) => Math.floor(value * 0.9));
  return '#' + rgb.map((value) => value.toString(16).padStart(2, '0')).join('');
}
