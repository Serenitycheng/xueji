import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import {
  parsePdfResource,
  pdfResourceHref,
  pdfXChangeHref,
} from '../lib/pdf-open';
import {
  issuePdfOpenTicket,
  verifyPdfOpenTicket,
} from '../lib/pdf-open-ticket';

process.env.SESSION_SECRET = 'local-pdf-tests-only-secret-32-characters';
process.env.STUDY_PASSWORD_HASH = 'local-pdf-tests-only-password-hash';
const pdf = { kind: 'material' as const, materialId: 'textbook-1' };

void test('PDF choices retain page numbers; downloading does not guess an OS application', () => {
  assert.equal(
    pdfResourceHref(pdf, 13),
    '/api/materials?id=textbook-1#page=13',
  );
  assert.equal(
    pdfResourceHref(pdf, 13, true),
    '/api/materials?id=textbook-1&download=1',
  );
  assert.equal(
    pdfXChangeHref(
      'https://study.example/api/materials?id=a&openToken=abc',
      13,
    ),
    'pxce:https://study.example/api/materials?id=a&openToken=abc#page=13',
  );
  assert.equal(
    pdfXChangeHref('https://study.example/a.pdf', -2),
    'pxce:https://study.example/a.pdf',
  );
  assert.throws(() => pdfXChangeHref('javascript:alert(1)'));
  assert.throws(() =>
    pdfXChangeHref('https://user:password@study.example/a.pdf'),
  );
  assert.throws(() => pdfXChangeHref('file:///C:/private.pdf'));
  assert.equal(
    parsePdfResource({ kind: 'material', materialId: '../another/file' }),
    undefined,
  );
  assert.equal(
    parsePdfResource({ kind: 'url', url: 'https://elsewhere.example/a.pdf' }),
    undefined,
  );
});

void test('external PDF ticket is scoped to one file and cannot authenticate as a session', async () => {
  const { token, expiresAt } = await issuePdfOpenTicket(pdf);
  assert.ok(await verifyPdfOpenTicket(token, pdf));
  assert.ok(expiresAt > Date.now() && expiresAt <= Date.now() + 300000);
  assert.equal(
    await verifyPdfOpenTicket(token, {
      kind: 'material',
      materialId: 'textbook-2',
    }),
    false,
  );
  assert.equal(
    await verifyPdfOpenTicket(token, { kind: 'development-plan' }),
    false,
  );
  const parts = token.split('.');
  parts[2] = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
  assert.equal(await verifyPdfOpenTicket(parts.join('.'), pdf), false);
  await assert.rejects(
    jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET!), {
      issuer: 'studyflow',
      audience: 'studyflow',
    }),
  );
  process.env.STUDY_PASSWORD_HASH = 'changed-password';
  assert.equal(await verifyPdfOpenTicket(token, pdf), false);
  process.env.STUDY_PASSWORD_HASH = 'local-pdf-tests-only-password-hash';
});

void test('expired grants and login sessions do not grant PDF access', async () => {
  const version = createHash('sha256')
    .update(process.env.STUDY_PASSWORD_HASH!)
    .digest('hex');
  const sign = (audience: string, expired: boolean) =>
    new SignJWT({ version, resource: pdf })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('studyflow')
      .setAudience(audience)
      .setSubject('owner')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 400)
      .setExpirationTime(expired ? Math.floor(Date.now() / 1000) - 1 : '1h')
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
  assert.equal(
    await verifyPdfOpenTicket(await sign('studyflow-pdf-open', true), pdf),
    false,
  );
  assert.equal(
    await verifyPdfOpenTicket(await sign('studyflow', false), pdf),
    false,
  );
});
