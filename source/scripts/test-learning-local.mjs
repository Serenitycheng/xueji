import assert from 'node:assert/strict';
import { createHarness } from './local-harness.mjs';
const h = await createHarness();
try {
  await h.module('tests/protection.integration.mjs');
  let snap = await (await h.api.GET()).json();
  assert.equal(snap.state.learning.directions.length, 6);
  const call = async (data, expected = 200) => {
    const command = {
      requestId: crypto.randomUUID(),
      revision: snap.revision,
      protocol: 5,
      ...data,
    };
    const r = await h.api.POST(
      new Request('http://localhost/api/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
          Host: 'localhost',
        },
        body: JSON.stringify(command),
      }),
    );
    const json = await r.json();
    assert.equal(r.status, expected, JSON.stringify(json));
    if (r.ok) snap = json.snapshot;
    return { json, command };
  };
  await call({ op: 'learning.direction.create', name: '隔离验收方向' });
  const d = snap.state.learning.directions.at(-1).id;
  await call({
    op: 'learning.unit.save',
    directionId: d,
    name: '一个可开始的单元',
  });
  const result = await call({
    op: 'learning.record.save',
    directionId: d,
    result: '看过，还未检验',
    contact: 'seen',
    nextMode: 'replace',
    nextTitle: '独立解释这段内容',
  });
  await call(result.command);
  assert.equal(snap.state.learning.records.length, 1);
  assert.equal(snap.state.learning.units[0].mastery, 'unknown');
  assert.equal(
    (await h.server.loadState('owner')).state.learning.actions[0].title,
    '独立解释这段内容',
  );
  console.log(
    'PASS A01-A11 A20: actual API commits learning record and next step together, reloads and replays once',
  );
  await call({
    op: 'learning.direction.update',
    directionId: d,
    status: 'paused',
  });
  await call({
    op: 'learning.direction.update',
    directionId: d,
    status: 'active',
  });
  assert.equal(snap.state.learning.records.length, 1);
  const before = structuredClone(snap.state),
    revision = snap.revision;
  await call(
    {
      op: 'learning.record.save',
      directionId: d,
      result: '失败不会部分保存',
      nextMode: 'replace',
      nextTitle: '',
    },
    400,
  );
  assert.deepEqual((await h.server.loadState('owner')).state, before);
  await call(
    {
      op: 'learning.record.save',
      directionId: d,
      result: '旧版本请求',
      revision: revision - 1,
    },
    409,
  );
  await call(
    {
      op: 'learning.record.save',
      directionId: d,
      result: '旧协议',
      protocol: 4,
    },
    426,
  );
  console.log(
    'PASS A12 A19 A21: pause preserves context, validation and stale/old writes leave data unchanged',
  );
  const exported = await (
    await h.history.GET(new Request('http://localhost/api/history?export=1'))
  ).json();
  assert.deepEqual(exported.state, snap.state);
  assert.equal(JSON.stringify(exported).includes('SESSION_SECRET'), false);
  await call({
    op: 'learning.reference.save',
    directionId: d,
    name: '路径',
    kind: 'local',
    target: 'D:\\学习\\材料.pdf',
  });
  const alien = await h.materials.GET(
    new Request('http://localhost/api/materials?id=foreign'),
  );
  assert.equal(alien.status, 404);
  globalThis.__learningTestAuth = false;
  assert.equal((await h.api.GET()).status, 401);
  assert.equal(
    (
      await h.materials.GET(
        new Request('http://localhost/api/materials?id=foreign'),
      )
    ).status,
    401,
  );
  globalThis.__learningTestAuth = true;
  await call({ op: 'plan.generate', date: '2026-09-15' }, 400);
  console.log(
    'PASS A18 A24-A27: export scope, authentication, foreign object and legacy scheduling boundaries',
  );
  const routes = [
    ['professional', 'PR-05-01-01'],
    ['development', 'DEV-01-01'],
    ['japanese', 'JP-00-01'],
    ['photo', 'PH-01-01'],
    ['stats', 'ST-1-1-1'],
    ['linear', 'LA-1-1'],
  ];
  for (const [curriculumId, itemId] of routes) {
    const directionId = snap.state.learning.directions.find(
      (d) => d.curriculumId === curriculumId,
    ).id;
    const selected = await call({
      op: 'learning.route.select',
      directionId,
      itemId,
    });
    const count = snap.state.learning.units.length;
    await call(selected.command);
    await call({ op: 'learning.route.select', directionId, itemId });
    assert.equal(snap.state.learning.units.length, count);
    const unitId = snap.state.learning.directions.find(
      (d) => d.id === directionId,
    ).currentUnitId;
    await call({
      op: 'learning.record.save',
      directionId,
      result: `记录 ${itemId}`,
      contact: 'seen',
    });
    const persisted = (await h.server.loadState('owner')).state.learning;
    assert.equal(persisted.records.at(-1).unitId, unitId);
    assert.equal(persisted.units.find((u) => u.id === unitId).contact, 'seen');
    assert.equal(
      persisted.units.find((u) => u.id === unitId).mastery,
      'unknown',
    );
    await call(
      { op: 'learning.route.select', directionId, itemId: 'not-in-this-route' },
      400,
    );
  }
  console.log(
    'PASS six curricula: actual API persists section selections and records; retries do not duplicate sections; invalid route IDs rejected',
  );
  // Fixture has old real-shaped entities, not a copy written into an actual account.
  const legacy = h.model.initialState();
  legacy.tasks = h.model.demoTasks();
  legacy.tasks[0].status = 'done';
  legacy.materials = [
    {
      id: 'fixture-book',
      subjectId: 'linear',
      name: '隔离教材.pdf',
      kind: 'pdf',
      size: 16,
      textLength: 0,
      status: 'needs-text',
      excerpt: '',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];
  await h.pg.query(
    'INSERT INTO study_profiles(user_id,data,revision) VALUES($1,$2,0)',
    ['migration-fixture', JSON.stringify(legacy)],
  );
  const migrated = await h.server.loadState('migration-fixture');
  const { learning, ...retained } = migrated.state;
  assert.deepEqual(retained, legacy);
  await h.server.saveState('migration-fixture', migrated.state, 0);
  assert.deepEqual(
    (await h.server.loadState('migration-fixture')).state,
    migrated.state,
  );
  // Existing private file identity and body can still be opened through the actual route.
  const owner = await h.server.loadState('owner');
  owner.state.materials = legacy.materials;
  await h.server.saveState('owner', owner.state, owner.revision);
  globalThis.__learningTestFiles.set(
    'owner/fixture-book/file',
    '%PDF-test-fixture',
  );
  const file = await h.materials.GET(
    new Request('http://localhost/api/materials?id=fixture-book'),
  );
  assert.equal(file.status, 200);
  assert.equal(await file.text(), '%PDF-test-fixture');
  assert.match(file.headers.get('cache-control'), /private/);
  console.log(
    'PASS A14 A22 A23: fixture migration retains all legacy fields and repeats without duplication; old attachment ID retrieves the same private body',
  );
} finally {
  await h.pg.close();
}
