export type PdfResource =
  | { kind: 'material'; materialId: string }
  | { kind: 'development-plan' };

export function parsePdfResource(value: unknown): PdfResource | undefined {
  if (!value || typeof value !== 'object') return;
  const input = value as Record<string, unknown>;
  if (input.kind === 'development-plan') return { kind: 'development-plan' };
  if (
    input.kind === 'material' &&
    typeof input.materialId === 'string' &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(input.materialId)
  )
    return { kind: 'material', materialId: input.materialId };
}
export function pdfPageNumber(page?: number) {
  return Number.isSafeInteger(page) && page! > 0 ? page : undefined;
}
export function pdfResourceHref(
  resource: PdfResource,
  page?: number,
  download = false,
) {
  const url = new URL(
    resource.kind === 'material' ? '/api/materials' : '/api/development-plan',
    'https://local.invalid',
  );
  if (resource.kind === 'material')
    url.searchParams.set('id', resource.materialId);
  if (download) url.searchParams.set('download', '1');
  if (!download && pdfPageNumber(page)) url.hash = 'page=' + page;
  return url.pathname + url.search + url.hash;
}
export function pdfXChangeHref(url: string, page?: number) {
  const target = new URL(url);
  if (
    target.username ||
    target.password ||
    !(
      target.protocol === 'https:' ||
      (target.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(target.hostname))
    )
  )
    throw new Error('无法打开这个 PDF 地址。');
  target.hash = pdfPageNumber(page) ? 'page=' + page : '';
  return 'pxce:' + target.href;
}
