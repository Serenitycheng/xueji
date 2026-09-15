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
const secret = 'local-browser-test-only-secret-32-characters',
  hash = 'local-browser-test-only-password-hash';
const token = await new SignJWT({
  version: createHash('sha256').update(hash).digest('hex'),
})
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject('owner')
  .setIssuer('studyflow')
  .setAudience('studyflow')
  .setExpirationTime('30m')
  .sign(new TextEncoder().encode(secret));
const base = process.env.STUDY_TEST_URL ?? 'http://127.0.0.1:4175';
const errors = [];
let dropNext = false;
const submitted = [];
async function context(viewport = { width: 1365, height: 950 }) {
  const ctx = await browser.newContext({
    viewport,
    extraHTTPHeaders: { Cookie: '__Host-study-session=' + token },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await ctx.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let response;
    const request = new Request(req.url(), {
      method: req.method(),
      headers: {
        'Content-Type': 'application/json',
        Origin: base,
        Host: new URL(base).host,
      },
      ...(req.method() === 'POST' ? { body: req.postData() } : {}),
    });
    if (url.pathname === '/api/study') {
      if (req.method() === 'GET') response = await h.api.GET();
      else {
        submitted.push(req.postDataJSON());
        response = await h.api.POST(request);
        if (dropNext && response.status === 200) {
          dropNext = false;
          return route.abort('connectionreset');
        }
      }
    } else if (url.pathname === '/api/history')
      response = await h.history.GET(request);
    else if (url.pathname === '/api/materials')
      response = await h.materials.GET(request);
    else if (url.pathname === '/api/material-jobs')
      response = Response.json({ jobs: [] });
    else if (url.pathname === '/api/auth' && req.method() === 'DELETE')
      response = Response.json({ ok: true });
    else
      return route.fulfill({
        status: 501,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Not included in isolated browser test',
        }),
      });
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  return ctx;
}
const ctx = await context(),
  page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => void d.accept());
async function button(name) {
  await page.getByRole('button', { name, exact: true }).click();
}
async function shown(text) {
  await page.getByText(text, { exact: false }).first().waitFor();
}
async function saved() {
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
try {
  await page.goto(base);
  await page.locator('.learning-card').nth(5).waitFor();
  assert.equal(
    await page.locator('[data-nextjs-dialog],.vite-error-overlay').count(),
    0,
  );
  console.log(
    'PASS browser smoke: real Next page loads, meaningful controls and no framework overlay',
  );
  await button('新建学习方向');
  await page.getByLabel('方向名称', { exact: true }).fill('开发基础（验收）');
  await button('建立方向');
  await shown('这次从这里继续');
  await button('写下当前内容');
  await page.getByLabel('单元名称', { exact: true }).fill('理解一个小程序');
  await button('保存单元');
  await saved();
  await button('调整下一步');
  await page
    .getByLabel('下一步具体动作', { exact: true })
    .fill('先解释输入和输出，再运行自己的小程序');
  await page.getByLabel('开始位置', { exact: true }).fill('自己的练习文件');
  await button('确认保存下一步');
  await saved();
  await button('开始／继续本次学习');
  await page
    .getByLabel('本次做到哪里', { exact: true })
    .fill('读到了输入处理，尚未独立验证');
  await page.getByText('卡点、依据与更多接续信息', { exact: true }).click();
  await page.getByLabel('内容接触状态', { exact: true }).selectOption('seen');
  await button('保存学习记录');
  await saved();
  await page.reload();
  await shown('读到了输入处理，尚未独立验证');
  await shown('先解释输入和输出，再运行自己的小程序');
  await shown('当前判断：未判断');
  const deepLink = page.url();
  assert.match(deepLink, /#learn\//);
  console.log(
    'PASS A01-A04 A06 A08 A10 A11 A18: manual learning loop, contact without mastery, reload and kept next step',
  );
  await button('开始／继续本次学习');
  await page
    .getByLabel('本次做到哪里', { exact: true })
    .fill('这句草稿还没有提交');
  await shown('表单已保留在本机');
  await page.reload();
  await shown('这次从这里继续');
  await button('开始／继续本次学习');
  await shown('已恢复本机表单草稿');
  assert.equal(
    await page.getByLabel('本次做到哪里', { exact: true }).inputValue(),
    '这句草稿还没有提交',
  );
  await page
    .getByLabel('本次做到哪里', { exact: true })
    .fill('独立尝试时仍需要提示');
  await page.getByLabel('当前判断', { exact: true }).selectOption('reinforce');
  await page
    .getByLabel('下次从哪里继续', { exact: true })
    .fill('先说明输入条件，然后独立改动一个参数');
  dropNext = true;
  await button('保存学习记录');
  await shown('本机草稿已保留');
  const lastCommand = submitted.at(-1);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto(base + '/#cloud');
  await shown('本机待处理草稿');
  await button('查询保存结果');
  await shown('已连接云端');
  assert.equal(
    (await h.server.loadState('owner')).state.learning.records.length,
    2,
  );
  assert.equal(submitted.at(-1).requestId, lastCommand.requestId);
  await page.goto(deepLink);
  await shown('独立尝试时仍需要提示');
  await shown('需要巩固');
  console.log(
    'PASS A19 A20: unsubmitted form survives reload; lost acknowledgement reuses receipt without duplicate record',
  );
  await button('复制学习行动');
  await shown('已复制');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(clipboard.includes(deepLink));
  assert.ok(clipboard.includes('先说明输入条件'));
  assert.ok(!clipboard.includes('已创建'));
  await page.getByText('方向状态与更多信息', { exact: true }).click();
  await button('暂停方向');
  await page.goto(base + '/#today');
  await page.locator('.learning-card').nth(5).waitFor();
  assert.equal(await page.getByRole('heading', {name:'开发基础（验收）',exact:true}).count(),0);
  await page.goto(deepLink);
  await shown('这次从这里继续');
  await page.getByText('方向状态与更多信息', { exact: true }).click();
  await button('恢复方向');
  await button('关联入口');
  await page.getByLabel('入口类型', { exact: true }).selectOption('local');
  await page.getByLabel('入口名称', { exact: true }).fill('本机练习文件');
  await page
    .getByLabel('地址或路径', { exact: true })
    .fill('D:\\学习\\练习.py');
  await button('保存入口');
  await saved();
  await shown('此路径仅适用于相应设备');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({
    path: 'work/tests/学习方向电脑ver1.png',
    fullPage: true,
  });
  console.log(
    'PASS A12 A16: pause/restore, exact direction deep link, copied action and local path fallback',
  );
  // A stale edit must be compared against actual current content, never blindly applied.
  await button('编辑方向');
  await page
    .getByLabel('编辑方向名称', { exact: true })
    .fill('本机尚未提交的新名称');
  const current = await h.server.loadState('owner');
  current.state.learning.directions.find(d=>d.name==='开发基础（验收）').goal = '另一设备保存的目标';
  await h.server.saveState('owner', current.state, current.revision);
  await button('保存方向');
  await shown('云端已有更新');
  assert.equal(
    await page.getByLabel('编辑方向名称', { exact: true }).inputValue(),
    '本机尚未提交的新名称',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto(base + '/#cloud');
  await button('比较与处理');
  await shown('另一设备保存的目标');
  await button('确认保留云端，放弃草稿');
  await saved();
  console.log(
    'PASS A21: actual revision conflict preserves local input and presents current direction for comparison',
  );
  await page.goto(deepLink);
  await shown('这次从这里继续');
  await button('退出');
  await page.waitForURL('**/login');
  const mobile = await context({ width: 390, height: 844 }),
    mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (e) => errors.push(e.message));
  await mobilePage.goto(deepLink);
  await mobilePage.getByText('独立尝试时仍需要提示').first().waitFor();
  assert.ok(
    await mobilePage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await mobilePage.screenshot({
    path: 'work/tests/学习方向手机ver1.png',
    fullPage: true,
  });
  await mobilePage.goto(base + '/#today');
  await mobilePage.getByText('已保存的下一步').first().waitFor();
  await mobilePage.screenshot({
    path: 'work/tests/继续学习手机ver1.png',
    fullPage: true,
  });
  await page.goto(deepLink);await shown('这次从这里继续');
  await button('开始／继续本次学习');
  await page.getByLabel('本次做到哪里',{exact:true}).fill('离线留下的真实停点');
  await ctx.setOffline(true);await button('保存学习记录');await shown('本机草稿已保留');
  assert.equal((await h.server.loadState('owner')).state.learning.records.length,2);
  await ctx.setOffline(false);await saved();await shown('离线留下的真实停点');
  assert.equal((await h.server.loadState('owner')).state.learning.records.length,3);
  await page.goto(base+'/#progress');await shown('学习记录 · 3');await shown('离线留下的真实停点');
  await page.goto(base+'/#materials');await shown('已关联的学习入口 · 1');await button('导入文件');await page.getByText('请选择所属学科').first().waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.goto(base+'/#settings');await shown('模型与预算');await page.getByLabel('每月人民币预算',{exact:true}).fill('80');await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/study')&&r.request().method()==='POST'),button('保存设置')]);assert.equal((await h.server.loadState('owner')).state.settings.budget,80);
  await page.goto(base+'/#legacy');await shown('待关联历史任务 · 0');await shown('旧课表、时间设置与日志');
  await page.goto(base+'/#routes');await page.getByLabel('方向名称',{exact:true}).fill('主题阅读（验收）');await page.getByLabel('方向类型',{exact:true}).selectOption('reading');await button('建立方向');await shown('这次从这里继续');await button('写下当前内容');await page.getByLabel('单元名称',{exact:true}).fill('正在阅读的问题');await button('保存单元');await saved();await button('开始／继续本次学习');assert.equal(await page.getByLabel('当前判断',{exact:true}).count(),0);await page.getByLabel('本次做到哪里',{exact:true}).fill('读到讨论部分，准备继续想这个问题');await button('保存学习记录');await saved();
  assert.deepEqual(errors, []);
  console.log('PASS A17 A18 A19 A24: true offline queue resumes once, material/settings/history pages render, exploration hides mastery assessment');
  console.log(
    'PASS A05 A28: fresh authenticated browser restores formal data; desktop/mobile layout and no uncaught browser errors',
  );
  await mobile.close();
} finally {
  await ctx.close();
  await browser.close();
  await h.pg.close();
}
