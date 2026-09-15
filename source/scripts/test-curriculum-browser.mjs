import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SignJWT } from 'jose';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { createHarness } from './local-harness.mjs';
const { chromium } = await import(
  process.env.STUDY_PLAYWRIGHT
    ? pathToFileURL(process.env.STUDY_PLAYWRIGHT).href
    : 'playwright'
);
const h = await createHarness();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.STUDY_TEST_URL ?? 'http://127.0.0.1:4176';
const token = await new SignJWT({
  version: createHash('sha256')
    .update('local-browser-test-only-password-hash')
    .digest('hex'),
})
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject('owner')
  .setIssuer('studyflow')
  .setAudience('studyflow')
  .setExpirationTime('30m')
  .sign(
    new TextEncoder().encode('local-browser-test-only-secret-32-characters'),
  );
const errors = [];
const calls = [];
let loseSelectionResponse = false;
const ctx = await browser.newContext({
  viewport: { width: 1365, height: 950 },
  extraHTTPHeaders: { Cookie: '__Host-study-session=' + token },
  permissions: ['clipboard-read', 'clipboard-write'],
});
await ctx.route('**/api/**', async (route) => {
  const req = route.request(),
    url = new URL(req.url());
  const request = new Request(req.url(), {
    method: req.method(),
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      Host: new URL(base).host,
    },
    ...(req.method() === 'POST' ? { body: req.postData() } : {}),
  });
  let response;
  if (url.pathname === '/api/study') {
    if (req.method() === 'GET') response = await h.api.GET();
    else {
      const data = req.postDataJSON();
      calls.push(data);
      response = await h.api.POST(request);
      if (
        loseSelectionResponse &&
        data.op === 'learning.route.select' &&
        response.ok
      ) {
        loseSelectionResponse = false;
        return route.abort('connectionreset');
      }
    }
  } else if (url.pathname === '/api/history')
    response = await h.history.GET(request);
  else if (url.pathname === '/api/materials')
    response = await h.materials.GET(request);
  else if (url.pathname === '/api/development-plan')
    response = await (
      await h.module('app/api/development-plan/route.mjs')
    ).GET();
  else if (url.pathname === '/api/material-jobs')
    response = Response.json({ jobs: [] });
  else
    response = Response.json(
      { error: 'Outside isolated test' },
      { status: 501 },
    );
  await route.fulfill({
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: Buffer.from(await response.arrayBuffer()),
  });
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => void d.accept());
const direction = (id) => `curriculum:${id}`;
const open = async (id) => {
  await page.goto(`${base}/#learn/${encodeURIComponent(direction(id))}`);
  await page.getByRole('region', { name: /学习路线$/ }).waitFor();
};
const selected = async (itemId) => {
  await page.getByLabel('选择当前学习小节').selectOption(itemId);
  await page.getByText('已保存当前学习位置', { exact: true }).waitFor();
};
const snapshot = async () => (await h.server.loadState('owner')).state;
try {
  const initial = await h.server.loadState('owner');
  initial.state.materials = [
    {
      id: '7b9c4a34-82ae-4116-a69a-01edb58ebfaf',
      subjectId: 'linear',
      name: '线代课本.pdf',
      kind: 'pdf',
      size: 16,
      textLength: 0,
      status: 'needs-text',
      excerpt: '',
      createdAt: '2026-09-15T00:00:00Z',
    },
  ];
  await h.server.saveState('owner', initial.state, initial.revision);
  globalThis.__learningTestFiles.set(
    'owner/7b9c4a34-82ae-4116-a69a-01edb58ebfaf/file',
    '%PDF-isolated-fixture',
  );
  await page.goto(base);
  await page.locator('.learning-card').nth(5).waitFor();
  assert.equal(await page.locator('.learning-card').count(), 6);
  assert.equal(
    await page.locator('[data-nextjs-dialog],.vite-error-overlay').count(),
    0,
  );
  console.log(
    'PASS browser smoke: all six directions render on the real Next page, no framework overlay',
  );

  await open('professional');
  assert.equal(await page.locator('[data-node-id]').count(), 31);
  assert.equal(
    await page.locator('[data-node-id="PR-05"] [data-step-id]').count(),
    16,
  );
  await selected('PR-05-01-01');
  await page
    .locator('.current-lesson-guide')
    .getByText('FA Chapter 1 Introduction to Accounting；英文视频', {
      exact: true,
    })
    .waitFor();
  await page
    .locator('[data-step-id="PR-05-01-01"]')
    .getByRole('button', { name: '记录这一节', exact: true })
    .click();
  await page
    .getByLabel('本次做到哪里', { exact: true })
    .fill('能说出三类会计信息使用者');
  await page.getByRole('button', { name: '保存学习记录', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.reload();
  await page
    .getByText('能说出三类会计信息使用者', { exact: true })
    .first()
    .waitFor();
  assert.equal(
    (await snapshot()).learning.records.at(-1).unitName.includes('信息使用者'),
    true,
  );
  console.log(
    'PASS professional: all 31 nodes and 16 basic lessons; chosen lesson record survives reload',
  );

  await open('linear');
  await selected('LA-1-1');
  const textbook = page
    .locator('.current-lesson-guide')
    .getByRole('link', { name: '打开教材 · PDF第9页', exact: true });
  assert.match(
    await textbook.getAttribute('href'),
    /api\/materials\?id=7b9c4a34.*#page=9$/,
  );
  const file = await page.evaluate(
    async (href) => {
      const r = await fetch(href);
      return { status: r.status, body: await r.text() };
    },
    await textbook.getAttribute('href'),
  );
  assert.equal(file.status, 200);
  assert.equal(file.body, '%PDF-isolated-fixture');
  await page.getByRole('button', { name: '复制学习行动', exact: true }).click();
  await page.getByText('已复制', { exact: true }).waitFor();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /PDF第9页/,
  );
  await page.getByLabel('查找路线内容').fill('特征值');
  assert.ok((await page.locator('[data-step-id]').count()) < 44);
  await page.getByLabel('查找路线内容').fill('完全不存在的小节');
  await page
    .getByText('没有找到对应小节，请换一个关键词。', { exact: true })
    .waitFor();
  await page.getByLabel('查找路线内容').fill('');
  console.log(
    'PASS math: textbook opens through private file API with exact page fragment; search and copied learning location work',
  );

  for (const [id, item] of [
    ['development', 'DEV-01-01'],
    ['japanese', 'JP-00-01'],
    ['photo', 'PH-01-01'],
    ['stats', 'ST-1-1-1'],
  ]) {
    await open(id);
    await selected(item);
    await page.reload();
    await page.locator('.current-lesson-guide').waitFor();
    assert.equal(await page.getByLabel('选择当前学习小节').inputValue(), item);
  }
  console.log(
    'PASS all remaining curricula: section selection persists and renders the correct lesson guidance',
  );

  await open('linear');
  loseSelectionResponse = true;
  await page.getByLabel('选择当前学习小节').selectOption('LA-1-2');
  await page
    .getByText('保存尚未确认，本机草稿已保留。可在“同步与版本”中查看。', {
      exact: true,
    })
    .waitFor();
  const uncertain = calls.at(-1);
  await page.goto(base + '/#cloud');
  await page.getByRole('button', { name: '查询保存结果', exact: true }).click();
  await page.getByText('已保存当前学习位置', { exact: true }).waitFor();
  assert.equal(calls.at(-1).requestId, uncertain.requestId);
  assert.equal(
    (await snapshot()).learning.units.filter(
      (u) => u.curriculumItemId === 'LA-1-2',
    ).length,
    1,
  );
  console.log(
    'PASS uncertain save: selection retry reuses receipt and does not duplicate a lesson',
  );

  await mkdir('work/tests/curriculum-browser', { recursive: true });
  await open('professional');
  await page.locator('.curriculum-panel').screenshot({
    path: 'work/tests/curriculum-browser/professional-desktop.png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await open('linear');
  await selected('LA-1-1');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    true,
  );
  await page
    .locator('.current-lesson-guide')
    .screenshot({ path: 'work/tests/curriculum-browser/linear-mobile.png' });
  await open('professional');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
    true,
  );
  assert.equal(await page.locator('[data-node-id]').count(), 31);
  const basicUnit = page.locator(
    '[data-node-id="PR-05"] [data-unit-id="PR-05-U01"]',
  );
  if ((await basicUnit.getAttribute('open')) === null)
    await basicUnit.locator(':scope>summary').click();
  await page.locator('[data-step-id="PR-05-01-02"]>summary').click();
  await page
    .locator('[data-step-id="PR-05-01-02"]')
    .getByRole('button', { name: '设为当前小节', exact: true })
    .click();
  await page.getByText('已保存当前学习位置', { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel('选择当前学习小节').inputValue(),
    'PR-05-01-02',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS mobile: no horizontal overflow, professional outline selection works, no browser JavaScript errors',
  );
} finally {
  await browser.close();
  await h.pg.close();
}
