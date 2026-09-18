'use client';
import { useEffect, useId, useState } from 'react';
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

type Mode = 'pdf-xchange' | 'browser' | 'download';
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
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('pdf-xchange');
  const [ticket, setTicket] = useState<{ href: string; expiresAt: number }>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [launched, setLaunched] = useState(false);
  const group = useId();
  const materialId =
    resource.kind === 'material' ? resource.materialId : undefined;
  useEffect(() => {
    if (!open || mode !== 'pdf-xchange') return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/pdf-open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            materialId
              ? { kind: 'material', materialId }
              : { kind: 'development-plan' },
          ),
          signal: controller.signal,
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
        if (!controller.signal.aborted)
          setTicket({
            href: pdfXChangeHref(url.href, page),
            expiresAt: data.expiresAt,
          });
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : '暂时无法准备 PDF，请重试。',
          );
      }
    })();
    return () => controller.abort();
  }, [open, mode, materialId, page, attempt]);
  useEffect(() => {
    if (!ticket) return;
    const timer = setTimeout(
      () => {
        setTicket(undefined);
        setError('打开准备已过期，请重新准备。');
      },
      Math.max(0, ticket.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [ticket]);
  const href =
    mode === 'pdf-xchange'
      ? ticket?.href
      : pdfResourceHref(resource, page, mode === 'download');
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setMode('pdf-xchange');
          setTicket(undefined);
          setError('');
          setLaunched(false);
          setOpen(true);
        }}
      >
        <ArrowUpRight size={16} />
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="pdf-open-dialog">
          <DialogHeader>
            <DialogTitle>选择打开方式</DialogTitle>
            <DialogDescription>
              {title}
              {page ? ' · PDF 第 ' + page + ' 页' : ''}
            </DialogDescription>
          </DialogHeader>
          <fieldset className="pdf-open-options">
            <legend className="sr-only">PDF 打开方式</legend>
            {(
              [
                [
                  'pdf-xchange',
                  'PDF-XChange Editor',
                  '默认 · 在本机阅读器中打开，保留页码定位',
                ],
                ['browser', '在浏览器中打开', '在新标签页阅读，保留 PDF 页序'],
                [
                  'download',
                  '下载后用其他应用打开',
                  '下载后在文件上选择“打开方式”',
                ],
              ] as const
            ).map(([value, name, detail]) => (
              <label
                key={value}
                htmlFor={group + value}
                aria-label={name}
                className={mode === value ? 'is-selected' : ''}
              >
                <input
                  id={group + value}
                  type="radio"
                  name={group}
                  value={value}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setTicket(undefined);
                    setError('');
                    setLaunched(false);
                  }}
                />
                <span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {mode === 'pdf-xchange' && (
            <p className="hint">
              需在这台设备安装 PDF-XChange Editor 10.4
              或更新版本。浏览器提示时允许打开；未能启动可改用浏览器或下载。编辑后请另存到本机，不会自动覆盖云端原件。
            </p>
          )}
          {mode === 'download' && page && (
            <p className="hint">下载后请手动跳到 PDF 第 {page} 页。</p>
          )}
          {mode === 'pdf-xchange' && error && (
            <div role="alert">
              <p className="form-error">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setTicket(undefined);
                  setError('');
                  setAttempt((n) => n + 1);
                }}
              >
                重新准备
              </Button>
            </div>
          )}
          {href ? (
            <a
              className="pdf-open-confirm"
              href={href}
              target={mode === 'browser' ? '_blank' : undefined}
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              onClick={(event) => {
                if (
                  mode === 'pdf-xchange' &&
                  (!ticket || ticket.expiresAt <= Date.now())
                ) {
                  event.preventDefault();
                  setTicket(undefined);
                  setError('');
                  setAttempt((n) => n + 1);
                  return;
                }
                setLaunched(true);
              }}
            >
              <ArrowUpRight size={16} />
              {mode === 'pdf-xchange'
                ? '用 PDF-XChange Editor 打开'
                : mode === 'browser'
                  ? '在浏览器中打开'
                  : '下载 PDF'}
            </a>
          ) : (
            mode === 'pdf-xchange' &&
            !error && (
              <Button disabled>
                <RefreshCw size={16} className="spin" />
                正在准备 PDF…
              </Button>
            )
          )}
          {launched && (
            <output className="hint">
              {mode === 'pdf-xchange'
                ? '已请求打开阅读器。若没有启动，请允许浏览器调用，或选择其他打开方式。'
                : mode === 'download'
                  ? '已请求下载，请在浏览器的下载列表中打开文件。'
                  : '已在新标签页请求打开。'}
            </output>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
