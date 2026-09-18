import assert from 'node:assert/strict';
import { createHarness } from './local-harness.mjs';
process.env.SESSION_SECRET = 'local-pdf-tests-only-secret-32-characters';
process.env.STUDY_PASSWORD_HASH = 'local-pdf-tests-only-password-hash';
const h = await createHarness();
const open = await h.module('app/api/pdf-open/route.mjs');
const development = await h.module('app/api/development-plan/route.mjs');
const request = (resource, origin = 'http://localhost') =>
  new Request('http://localhost/api/pdf-open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Host: 'localhost',
    },
    body: JSON.stringify(resource),
  });
try {
  const { state, revision } = await h.server.loadState('owner');
  state.materials.push(
    {
      id: 'pdf-test',
      subjectId: 'general',
      name: '教材 中文.pdf',
      kind: 'pdf',
      size: 10,
      status: 'needs-text',
      textLength: 0,
      createdAt: '',
    },
    {
      id: 'text-test',
      subjectId: 'general',
      name: '笔记.txt',
      kind: 'text',
      size: 10,
      status: 'needs-text',
      textLength: 0,
      createdAt: '',
    },
  );
  await h.server.saveState('owner', state, revision);
  globalThis.__learningTestFiles.set(
    'owner/pdf-test/file',
    '%PDF-1.7\nisolated PDF fixture',
  );
  const before = await h.server.loadState('owner');
  const resource = { kind: 'material', materialId: 'pdf-test' };
  assert.equal(
    (await open.POST(request(resource, 'https://untrusted.example'))).status,
    403,
  );
  assert.equal(
    (await open.POST(request({ kind: 'material', materialId: 'alien' })))
      .status,
    404,
  );
  assert.equal(
    (await open.POST(request({ kind: 'material', materialId: 'text-test' })))
      .status,
    400,
  );
  globalThis.__learningTestAuth = false;
  assert.equal((await open.POST(request(resource))).status, 401);
  globalThis.__learningTestAuth = true;
  const issued = await open.POST(request(resource));
  assert.equal(issued.status, 200);
  assert.equal(issued.headers.get('Cache-Control'), 'private, no-store');
  const { path } = await issued.json();
  globalThis.__learningTestAuth = false;
  assert.equal(
    (
      await h.materials.GET(
        new Request('http://localhost/api/materials?id=pdf-test'),
      )
    ).status,
    401,
  );
  const downloaded = await h.materials.GET(
    new Request('http://localhost' + path),
  );
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers.get('Content-Type'), /application\/pdf/);
  assert.match(await downloaded.text(), /^%PDF/);
  assert.equal(
    (await h.materials.GET(new Request('http://localhost' + path + '&text=1')))
      .status,
    403,
  );
  assert.equal(
    (
      await h.materials.GET(
        new Request(
          'http://localhost' + path.replace('id=pdf-test', 'id=text-test'),
        ),
      )
    ).status,
    401,
  );
  const wrongRoute = new URL('http://localhost' + path);
  wrongRoute.pathname = '/api/development-plan';
  assert.equal((await development.GET(new Request(wrongRoute))).status, 401);
  assert.equal((await open.POST(request(resource))).status, 401);
  globalThis.__learningTestAuth = true;
  const attachment = await h.materials.GET(
    new Request('http://localhost/api/materials?id=pdf-test&download=1'),
  );
  assert.match(attachment.headers.get('Content-Disposition'), /^attachment;/);
  const planGrant = await (
    await open.POST(request({ kind: 'development-plan' }))
  ).json();
  globalThis.__learningTestAuth = false;
  const plan = await development.GET(
    new Request('http://localhost' + planGrant.path),
  );
  assert.equal(plan.status, 200);
  assert.equal(
    Buffer.from(await plan.arrayBuffer())
      .subarray(0, 4)
      .toString(),
    '%PDF',
  );
  globalThis.__learningTestAuth = true;
  const after = await h.server.loadState('owner');
  assert.equal(after.revision, before.revision);
  assert.deepEqual(after.state, before.state);
  console.log(
    'PDF API checks passed: authentication, origin, per-file scope, original bytes, download, plan, unchanged learning state.',
  );
} finally {
  await h.pg.close();
}
