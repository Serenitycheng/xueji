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
process.env.SESSION_SECRET = 'local-browser-test-only-secret-32-characters';
process.env.STUDY_PASSWORD_HASH = 'local-browser-test-only-password-hash';
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
let failPdfOpen = false;
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
  else if (url.pathname === '/api/pdf-open') {
    response = failPdfOpen
      ? Response.json({ error: '模拟断线，请重试。' }, { status: 503 })
      : await (await h.module('app/api/pdf-open/route.mjs')).POST(request);
    failPdfOpen = false;
  } else if (url.pathname === '/api/materials')
    response = await h.materials.GET(request);
  else if (url.pathname === '/api/development-plan')
    response = await (
      await h.module('app/api/development-plan/route.mjs')
    ).GET(request);
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
  initial.state.learning.references.push({
    id: 'reference:pdf-test',
    directionId: 'curriculum:linear',
    name: '线代教材引用',
    kind: 'attachment',
    target: '7b9c4a34-82ae-4116-a69a-01edb58ebfaf',
    location: '',
    purpose: '',
    primary: true,
    updatedAt: '',
  });
  initial.state.materials.push({
    ...initial.state.materials[0],
    id: 'fa396af4-5792-4400-baf4-c24a9897c928',
    subjectId: 'stats',
    name: '概率论课本.pdf',
  });
  // Older saved progress in two finer subsections must remain intact.
  for (const suffix of ['1', '2']) {
    const itemId = 'ST-1-5-' + suffix;
    const unitId = 'curriculum-unit:curriculum:stats:' + itemId;
    const name = suffix === '1' ? '§1.5.1 全概率公式' : '§1.5.2 贝叶斯公式';
    initial.state.learning.units.push({
      id: unitId,
      directionId: direction('stats'),
      name,
      scope: name,
      endCondition: '原小节完成标准',
      contact: 'seen',
      mastery: 'independent',
      evidence: '旧小节练习',
      blocker: '',
      gap: '',
      archived: false,
      origin: 'curriculum',
      curriculumItemId: itemId,
      updatedAt: '2026-09-15T00:00:00Z',
    });
    initial.state.learning.records.push({
      id: 'record:old-stats-' + suffix,
      directionId: direction('stats'),
      unitId,
      directionName: '概率论与数理统计',
      unitName: name,
      goal: '',
      result: '保留的旧小节记录' + suffix,
      mastery: 'independent',
      contact: 'seen',
      evidence: '旧小节练习',
      nextMode: 'keep',
      createdAt: '2026-09-15T00:00:00Z',
    });
  }
  initial.state.learning.directions.find(
    (d) => d.curriculumId === 'stats',
  ).currentUnitId = 'curriculum-unit:curriculum:stats:ST-1-5-2';
  await h.server.saveState('owner', initial.state, initial.revision);
  globalThis.__learningTestFiles.set(
    'owner/fa396af4-5792-4400-baf4-c24a9897c928/file',
    '%PDF-isolated-stats-fixture',
  );
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
  assert.equal(
    await page
      .locator(
        '.current-lesson-guide a[href="https://www.icourse163.org/course/BIT-32001"]',
      )
      .count(),
    1,
  );
  assert.equal(
    await page.locator('a[href*="3blue1brown"],a[href*="3Blue1Brown"]').count(),
    0,
  );
  const textbook = page
    .locator('.current-lesson-guide')
    .getByRole('button', { name: '打开教材 · PDF第9页', exact: true });
  await textbook.click();
  const chooser = page.getByRole('dialog', { name: '选择打开方式' });
  assert.ok(
    await chooser
      .getByRole('radio', { name: /^PDF-XChange Editor/ })
      .isChecked(),
  );
  const editor = chooser.getByRole('link', {
    name: '用 PDF-XChange Editor 打开',
    exact: true,
  });
  await editor.waitFor();
  const editorHref = await editor.getAttribute('href');
  assert.match(
    editorHref,
    /^pxce:http:\/\/127\.0\.0\.1:4176\/api\/materials\?id=7b9c4a34.*openToken=.*#page=9$/,
  );
  const file = await page.evaluate(async (href) => {
    const r = await fetch(href.slice(5));
    return { status: r.status, body: await r.text() };
  }, editorHref);
  assert.equal(file.status, 200);
  assert.equal(file.body, '%PDF-isolated-fixture');
  await mkdir('work/tests/pdf-open', { recursive: true });
  await chooser.screenshot({ path: 'work/tests/pdf-open/desktop.png' });
  await chooser.getByRole('radio', { name: /^在浏览器中打开/ }).check();
  const browserLink = chooser.getByRole('link', {
    name: '在浏览器中打开',
    exact: true,
  });
  assert.match(
    await browserLink.getAttribute('href'),
    /api\/materials\?id=7b9c4a34.*#page=9$/,
  );
  assert.equal(await browserLink.getAttribute('target'), '_blank');
  await chooser.getByRole('radio', { name: /^下载后用其他应用打开/ }).check();
  const downloadLink = chooser.getByRole('link', {
    name: '下载 PDF',
    exact: true,
  });
  const downloadEvent = page.waitForEvent('download');
  await downloadLink.click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), '线代课本.pdf');
  await download.delete();
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  failPdfOpen = true;
  await textbook.click();
  await chooser
    .getByRole('alert')
    .getByText('模拟断线，请重试。', { exact: true })
    .waitFor();
  await chooser.getByRole('button', { name: '重新准备', exact: true }).click();
  await chooser
    .getByRole('link', { name: '用 PDF-XChange Editor 打开', exact: true })
    .waitFor();
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await textbook.click();
  await chooser
    .getByRole('link', { name: '用 PDF-XChange Editor 打开', exact: true })
    .waitFor();
  await chooser.screenshot({ path: 'work/tests/pdf-open/mobile.png' });
  const box = await chooser.boundingBox();
  assert.ok(box && box.x >= 0 && box.x + box.width <= 390);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 1365, height: 950 });
  console.log(
    'PASS PDF opener: default reader, scoped URL and page, browser option, download filename, retry, mobile dialog',
  );
  await page
    .locator('.reference-row')
    .getByRole('button', { name: '打开原件', exact: true })
    .click();
  await chooser
    .getByRole('link', { name: '用 PDF-XChange Editor 打开', exact: true })
    .waitFor();
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto(base + '/#materials');
  await page.getByRole('button', { name: /线代课本.pdf/ }).waitFor();
  assert.equal(
    await page
      .locator(
        '.catalog-card a[href="https://www.icourse163.org/course/BIT-32001"]',
      )
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator(
        '.catalog-card a[href="https://www.bilibili.com/video/BV1JXppejE8q/"]',
      )
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator(
        '.catalog-card a[href*="3blue1brown"],.catalog-card a[href*="stat110"],.catalog-card a[href*="cs50.harvard"]',
      )
      .count(),
    0,
  );
  await page.getByRole('button', { name: /线代课本.pdf/ }).click();
  const detail = page.getByRole('dialog', {
    name: '线代课本.pdf',
    exact: true,
  });
  await detail
    .getByRole('button', { name: '打开原始资料', exact: true })
    .click();
  await chooser
    .getByRole('link', { name: '用 PDF-XChange Editor 打开', exact: true })
    .waitFor();
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  assert.ok(await detail.isVisible());
  await detail.getByRole('button', { name: 'Close', exact: true }).click();
  await open('development');
  await selected('DEV-01-01');
  const pythonGuide = page.locator('.current-lesson-guide');
  await pythonGuide
    .getByRole('link', { name: '前往资料库', exact: true })
    .waitFor();
  assert.equal(
    await pythonGuide
      .getByRole('button', { name: '打开教材 · PDF第68页', exact: true })
      .count(),
    0,
  );
  // Simulate an upload already registered by the normal private library flow.
  const pythonState = await h.server.loadState('owner');
  const pythonId = '8cba18af-5bb7-4778-a251-08d595a9e0b8';
  pythonState.state.materials.push({
    ...pythonState.state.materials[0],
    id: pythonId,
    subjectId: 'development',
    name: 'Python语言程序设计基础 第三版 (嵩天, 黄天羽, 杨雅婷) (z-library.sk, 1lib.sk, z-lib.sk).pdf',
    pages: 416,
  });
  await h.server.saveState('owner', pythonState.state, pythonState.revision);
  globalThis.__learningTestFiles.set(
    'owner/' + pythonId + '/file',
    '%PDF-isolated-python-fixture',
  );
  await page.reload();
  await pythonGuide
    .getByRole('button', { name: '打开教材 · PDF第68页', exact: true })
    .click();
  const pythonLink = chooser.getByRole('link', {
    name: '用 PDF-XChange Editor 打开',
    exact: true,
  });
  await pythonLink.waitFor();
  assert.match(
    await pythonLink.getAttribute('href'),
    /id=8cba18af.*openToken=.*#page=68$/,
  );
  const pythonDownload = await page.evaluate(
    async (href) => {
      const r = await fetch(href.slice(5));
      return { status: r.status, body: await r.text() };
    },
    await pythonLink.getAttribute('href'),
  );
  assert.deepEqual(pythonDownload, {
    status: 200,
    body: '%PDF-isolated-python-fixture',
  });
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(
    await pythonGuide
      .getByRole('link', { name: '前往资料库', exact: true })
      .count(),
    0,
  );
  await page.getByRole('button', { name: '复制学习行动', exact: true }).click();
  await page.getByText('已复制', { exact: true }).waitFor();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /id=8cba18af.*#page=68/,
  );
  await mkdir('work/tests/resources', { recursive: true });
  await pythonGuide.screenshot({
    path: 'work/tests/resources/python-desktop.png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await pythonGuide.screenshot({
    path: 'work/tests/resources/python-mobile.png',
  });
  await page.setViewportSize({ width: 1365, height: 950 });
  console.log(
    'PASS Python textbook: missing-file hint, private upload resolution, PDF page 68, copied URL and mobile layout',
  );
  await page
    .locator('.current-lesson-guide')
    .getByRole('button', { name: '打开方案原件', exact: true })
    .click();
  const planLink = chooser.getByRole('link', {
    name: '用 PDF-XChange Editor 打开',
    exact: true,
  });
  await planLink.waitFor();
  assert.match(
    await planLink.getAttribute('href'),
    /\/api\/development-plan\?openToken=/,
  );
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  await open('linear');
  console.log(
    'PASS PDF entries: learning references, nested library dialog, original development plan',
  );

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

  await open('photo');
  await selected('PH-04-01');
  assert.equal(
    await page
      .locator(
        '.current-lesson-guide a[href="https://www.bilibili.com/video/BV1Xx4y147Vf/"]',
      )
      .count(),
    1,
  );
  await open('stats');
  assert.equal(
    await page
      .locator(
        '.current-lesson-guide a[href="https://www.bilibili.com/video/BV1JXppejE8q/"]',
      )
      .count(),
    1,
  );
  assert.equal(
    await page.getByText('Harvard Stat110', { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator('[data-step-id]').count(), 37);
  assert.equal(
    await page.getByLabel('选择当前学习小节').inputValue(),
    'ST-1-5',
  );
  assert.equal(await page.locator('[data-step-id="ST-1-5-1"]').count(), 0);
  assert.equal(
    await page.getByLabel('选择当前学习小节').locator('option').count(),
    38,
  );
  const statsSection = page.locator('[data-step-id="ST-1-5"]');
  assert.ok(
    await statsSection
      .locator('summary')
      .innerText()
      .then((t) => t.includes('整节未判断') && t.includes('2 条记录')),
  );
  assert.equal(
    await statsSection
      .getByRole('button', { name: '按整节继续学习', exact: true })
      .isEnabled(),
    true,
  );
  const oldStats = (await snapshot()).learning;
  const legacyUnits = oldStats.units.filter(
    (u) => u.directionId === direction('stats'),
  );
  const legacyRecords = oldStats.records.filter(
    (r) => r.directionId === direction('stats'),
  );
  await page.getByLabel('查找路线内容').fill('最大似然估计');
  assert.equal(await page.locator('[data-step-id]').count(), 1);
  assert.equal(await page.locator('[data-step-id="ST-7-1"]').count(), 1);
  await page.getByLabel('查找路线内容').fill('');
  await statsSection
    .getByRole('button', { name: '记录这一节', exact: true })
    .click();
  await page
    .getByLabel('本次做到哪里', { exact: true })
    .fill('完成整节的全概率与贝叶斯练习');
  await page.getByRole('button', { name: '保存学习记录', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.reload();
  await page.locator('.current-lesson-guide').waitFor();
  const wholeState = (await snapshot()).learning;
  const whole = wholeState.units.find((u) => u.curriculumItemId === 'ST-1-5');
  assert.equal(whole.mastery, 'unknown');
  assert.equal(wholeState.records.at(-1).unitId, whole.id);
  assert.equal(
    wholeState.directions.find((d) => d.curriculumId === 'stats').currentUnitId,
    whole.id,
  );
  assert.deepEqual(
    wholeState.units.filter((u) => legacyUnits.some((old) => old.id === u.id)),
    legacyUnits,
  );
  assert.deepEqual(
    wholeState.records.filter((r) =>
      legacyRecords.some((old) => old.id === r.id),
    ),
    legacyRecords,
  );
  assert.match(await statsSection.locator('summary').innerText(), /3 条记录/);
  await statsSection
    .getByRole('button', { name: '打开教材 · PDF第69页', exact: true })
    .click();
  const statsEditor = chooser.getByRole('link', {
    name: '用 PDF-XChange Editor 打开',
    exact: true,
  });
  await statsEditor.waitFor();
  assert.match(
    await statsEditor.getAttribute('href'),
    /id=fa396af4.*#page=69$/,
  );
  await chooser.getByRole('button', { name: 'Close', exact: true }).click();
  await mkdir('work/tests/stats-sections', { recursive: true });
  await statsSection.screenshot({
    path: 'work/tests/stats-sections/desktop.png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await statsSection.screenshot({
    path: 'work/tests/stats-sections/mobile.png',
  });
  await page.setViewportSize({ width: 1365, height: 950 });
  console.log(
    'PASS stats: 37 sections, legacy position and both records retained, whole-section record and unknown mastery, subtopic search, PDF page 69, mobile layout',
  );

  for (const [id, item] of [
    ['development', 'DEV-01-01'],
    ['japanese', 'JP-00-01'],
    ['photo', 'PH-01-01'],
    ['stats', 'ST-1-1'],
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
