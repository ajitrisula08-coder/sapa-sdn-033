import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function PageHeader({ title, subtitle, icon: Icon, actions }: {
  title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-gold-300 shadow-soft">
            <Icon className="size-6" />
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight text-emerald-950 sm:text-[2.1rem]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin text-emerald-600`} aria-label="Memuat" />;
}

export function LoadingBlock({ label = 'Memuat data…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-sm text-slate-500 ${className}`}>
      <Spinner /> {label}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: {
  title: string; description?: string; action?: ReactNode; icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon className="size-7" /></div>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-6 py-8 text-center">
      <AlertTriangle className="size-8 text-rose-500" />
      <p className="text-sm font-medium text-rose-700">{message}</p>
      {onRetry && <button className="btn-outline" onClick={onRetry}><RefreshCw className="size-4" /> Coba lagi</button>}
    </div>
  );
}

const BADGE_TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  gold: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;
export function Badge({ children, tone = 'emerald', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE_TONES[tone]} ${className}`}>{children}</span>;
}

export function Field({ label, hint, children, required, className = '' }: { label: string; hint?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];
  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl ${width} animate-fade-up`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-xl font-bold text-emerald-950">{title}</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Tutup"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Dialog konfirmasi ----------
interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  /** Jika diisi, pengguna wajib mengisi alasan (minimal 5 karakter). */
  requireReason?: string;
}
type ConfirmFn = (o: ConfirmOptions) => Promise<{ ok: boolean; reason: string }>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (r: { ok: boolean; reason: string }) => void }) | null>(null);
  const [reason, setReason] = useState('');
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => { setReason(''); setState({ ...o, resolve }); }), []);
  const close = (ok: boolean) => { state?.resolve({ ok, reason: reason.trim() }); setState(null); };
  const reasonOk = !state?.requireReason || reason.trim().length >= 5;
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title ?? ''} size="sm"
        footer={<>
          <button className="btn-outline" onClick={() => close(false)}>Batal</button>
          <button className={state?.tone === 'danger' ? 'btn-danger' : 'btn-primary'} disabled={!reasonOk} onClick={() => close(true)}>
            {state?.confirmLabel ?? 'Ya, lanjutkan'}
          </button>
        </>}>
        <div className="space-y-4 text-sm text-slate-600">
          <div>{state?.message}</div>
          {state?.requireReason && (
            <Field label={state.requireReason} required hint="Minimal 5 karakter. Alasan ini tersimpan di riwayat audit.">
              <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export function useConfirm() {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error('useConfirm must be inside ConfirmProvider');
  return c;
}

// ---------- Angka beranimasi ringan ----------
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDisplay(value); from.current = value; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular">{format(Math.round(display))}</span>;
}

export function Pagination({ page, pageSize, count, onChange }: { page: number; pageSize: number; count: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (count <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>Halaman {page + 1} dari {pages} · {count} data</span>
      <div className="flex gap-2">
        <button className="btn-outline px-3 py-1.5" disabled={page === 0} onClick={() => onChange(page - 1)}>Sebelumnya</button>
        <button className="btn-outline px-3 py-1.5" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Berikutnya</button>
      </div>
    </div>
  );
}
