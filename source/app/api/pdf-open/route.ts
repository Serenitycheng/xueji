import {
  identity,
  checkOrigin,
  loadState,
  AppError,
  respondError,
} from '@/lib/server';
import { parsePdfResource, pdfResourceHref } from '@/lib/pdf-open';
import { issuePdfOpenTicket } from '@/lib/pdf-open-ticket';

export async function POST(request: Request) {
  try {
    if (!request.headers.get('origin'))
      throw new AppError('请从学迹页面打开资料。', 403);
    checkOrigin(request);
    const user = await identity();
    const body = await request.text();
    if (body.length > 1024) throw new AppError('资料参数过长。');
    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      throw new AppError('资料参数无效。');
    }
    const resource = parsePdfResource(input);
    if (!resource) throw new AppError('请选择有效的 PDF 资料。');
    if (resource.kind === 'material') {
      const { state } = await loadState(user.id);
      const material = state.materials.find(
        (m) => m.id === resource.materialId,
      );
      if (!material) throw new AppError('找不到这份资料。', 404);
      if (material.kind !== 'pdf' || material.url)
        throw new AppError('这份资料不是已上传的 PDF。');
    }
    const { token, expiresAt } = await issuePdfOpenTicket(resource);
    const url = new URL(pdfResourceHref(resource), 'https://local.invalid');
    url.searchParams.set('openToken', token);
    return Response.json(
      { path: url.pathname + url.search, expiresAt },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Referrer-Policy': 'no-referrer',
        },
      },
    );
  } catch (error) {
    return respondError(error);
  }
}
