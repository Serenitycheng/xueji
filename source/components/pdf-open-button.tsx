'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  pdfResourceHref,
  pdfXChangeHref,
  type PdfResource,
} from '@/lib/pdf-open';

type Ticket = { href: string; expiresAt: number; resourceKey: string };

export function PdfOpenButton({
  resource,
  title,
  page,
  label = '打开原始资料',
  className = 'resource-open',
}: {
  resource: PdfResource;
  title: string;
  page?: number;
  label?: string;
  className?: string;
}) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState('');
  const ticketRef = useRef<Ticket | undefined>(undefined);
  const requestRef = useRef<
    { resourceKey: string; promise: Promise<Ticket> } | undefined
  >(undefined);
  const materialId =
    resource.kind === 'material' ? resource.materialId : undefined;
  const resourceKey =
    resource.kind +
    ':' +
    (materialId ?? 'development-plan') +
    ':' +
    (page ?? '');

  const prepare = async () => {
    if (
      ticketRef.current?.resourceKey === resourceKey &&
      ticketRef.current.expiresAt > Date.now() + 5_000
    )
      return ticketRef.current;
    if (requestRef.current?.resourceKey === resourceKey)
      return requestRef.current.promise;
    const request = (async () => {
      const response = await fetch('/api/pdf-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          materialId
            ? { kind: 'material', materialId }
            : { kind: 'development-plan' },
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '暂时无法准备 PDF。');
      const url = new URL(data.path, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        url.pathname !==
          (materialId ? '/api/materials' : '/api/development-plan') ||
        typeof data.expiresAt !== 'number'
      )
        throw new Error('资料打开地址无效。');
      const ticket = {
        href: pdfXChangeHref(url.href, page),
        expiresAt: data.expiresAt,
        resourceKey,
      };
      ticketRef.current = ticket;
      return ticket;
    })();
    const pending = { resourceKey, promise: request };
    requestRef.current = pending;
    try {
      return await request;
    } finally {
      if (requestRef.current === pending) requestRef.current = undefined;
    }
  };

  const openEditor = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const ticket = await prepare();
      setLaunched(true);
      setFallbackOpen(false);
      const openEvent = new CustomEvent('study:pdf-open', {
        cancelable: true,
        detail: { href: ticket.href },
      });
      if (window.dispatchEvent(openEvent)) window.location.href = ticket.href;
    } catch (e) {
      setError(e instanceof Error ? e.message : '暂时无法准备 PDF，请重试。');
      setFallbackOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const browserHref = pdfResourceHref(resource, page, false);
  const downloadHref = pdfResourceHref(resource, page, true);

  return (
    <>
      <span className="pdf-open-control">
        <button
          type="button"
          className={className}
          disabled={busy}
          onPointerEnter={() => void prepare().catch(() => undefined)}
          onFocus={() => void prepare().catch(() => undefined)}
          onClick={() => void openEditor()}
        >
          {busy ? (
            <RefreshCw size={16} className="spin" />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {busy ? '正在打开…' : label}
        </button>
        {launched && (
          <button
            type="button"
            className="pdf-open-alternatives"
            onClick={() => setFallbackOpen(true)}
          >
            没打开？
          </button>
        )}
      </span>
      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="pdf-open-dialog">
          <DialogHeader>
            <DialogTitle>教材没有打开？</DialogTitle>
            <DialogDescription>
              {title}
              {page ? ' · PDF 第 ' + page + ' 页' : ''}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="hint">
            若浏览器提示，请允许打开本机应用。
          </p>
          <div className="pdf-open-fallback-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void openEditor()}
            >
              {busy && <RefreshCw size={16} className="spin" />}
              再试一次 PDF-XChange
            </Button>
            <a
              className="pdf-open-fallback-link"
              href={browserHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              在浏览器中打开
              <ArrowUpRight size={15} />
            </a>
            <a className="pdf-open-fallback-link" href={downloadHref} download>
              下载 PDF
            </a>
          </div>
          {page && <p className="hint">下载后请手动跳到 PDF 第 {page} 页。</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
