import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appearancePage,
  defaultPaperTone,
  paperInk,
  paperTones,
  readAppearance,
} from '../lib/appearance';

void test('appearance follows each page and learning direction, including legacy links', () => {
  assert.equal(appearancePage('/', '#settings'), 'settings');
  assert.equal(
    appearancePage('/', '#learn/curriculum%3Alinear'),
    'learn:curriculum:linear',
  );
  assert.equal(
    appearancePage('/', '#learn/curriculum%3Astats'),
    'learn:curriculum:stats',
  );
  assert.equal(appearancePage('/login', '#settings'), 'login');
  assert.equal(appearancePage('/', '#schedule'), 'legacy');
  for (const hash of [
    '#unknown',
    '#learn/%zz',
    '#learn/',
    '#learn/' + 'x'.repeat(161),
  ]) {
    assert.equal(appearancePage('/', hash), 'today');
  }
});

void test('stored appearance retains independent valid page colors and rejects corrupt values', () => {
  const raw = JSON.stringify({
    version: 1,
    colors: {
      today: '#80674D',
      'learn:curriculum:linear': '#718c7c',
      settings: 'red',
      cloud: '#fff',
      progress: 123,
      unexpected: '#657f91',
    },
  });
  assert.deepEqual(readAppearance(raw), {
    today: '#80674d',
    'learn:curriculum:linear': '#718c7c',
  });
  for (const invalid of [
    'broken',
    'null',
    '{"version":2,"colors":{"today":"#80674d"}}',
    '{"version":1,"colors":[]}',
  ]) {
    assert.deepEqual(readAppearance(invalid), {});
  }
  assert.deepEqual(
    readAppearance('{"version":1,"colors":{"__proto__":"#80674d"}}'),
    {},
  );
});

void test('preset and custom accents keep primary button white text above 4.5 contrast', () => {
  for (const color of [
    ...paperTones.map((tone) => tone.color),
    '#ffffff',
    '#ffff00',
    '#00ff00',
    '#000000',
  ]) {
    const ink = paperInk(color);
    const linear = [1, 3, 5].map((start) => {
      const value = parseInt(ink.slice(start, start + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance =
      linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    assert.ok(1.05 / (luminance + 0.05) >= 4.5, color);
  }
  assert.equal(paperInk('invalid'), defaultPaperTone);
});
