import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { parsePdfResource, type PdfResource } from './pdf-open';

const audience = 'studyflow-pdf-open';
export const PDF_OPEN_SECONDS = 300;
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('SESSION_SECRET is not configured');
  return new TextEncoder().encode(secret);
}
function passwordVersion() {
  return createHash('sha256')
    .update(process.env.STUDY_PASSWORD_HASH ?? '')
    .digest('hex');
}
// Grants are limited to one PDF and cannot act as login sessions.
export async function issuePdfOpenTicket(resource: PdfResource) {
  const expiresAt = Math.floor(Date.now() / 1000) + PDF_OPEN_SECONDS;
  const token = await new SignJWT({ resource, version: passwordVersion() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('studyflow')
    .setAudience(audience)
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());
  return { token, expiresAt: expiresAt * 1000 };
}
export async function verifyPdfOpenTicket(
  token: string,
  resource: PdfResource,
) {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ['HS256'],
      issuer: 'studyflow',
      audience,
      maxTokenAge: '5m',
    });
    const granted = parsePdfResource(payload.resource);
    return (
      payload.sub === 'owner' &&
      payload.version === passwordVersion() &&
      typeof payload.exp === 'number' &&
      typeof payload.iat === 'number' &&
      payload.exp - payload.iat <= PDF_OPEN_SECONDS &&
      granted?.kind === resource.kind &&
      (resource.kind === 'development-plan' ||
        (granted.kind === 'material' &&
          granted.materialId === resource.materialId))
    );
  } catch {
    return false;
  }
}
