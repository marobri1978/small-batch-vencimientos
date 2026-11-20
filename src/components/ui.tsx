import { useEffect, useId, useRef, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { STATUS_LABEL } from '../domain/status';
import type { DocStatus } from '../domain/types';

/* ---------- Íconos (trazo simple, como tiza) ---------- */

const paths = {
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  close: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  refresh: 'M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  pin: 'M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8',
  glass: 'M8 2h8l-1 8a3 3 0 0 1-6 0zM12 13v8M8 21h8',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0M12 9v4M12 17h.01',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

/* ---------- Estado: color + palabra ---------- */

const STATUS_STYLE: Record<DocStatus, { pill: string; dot: string; bar: string }> = {
  vigente: { pill: 'bg-oliva/15 text-[#3f5a33] border-oliva/40', dot: 'bg-oliva', bar: 'bg-oliva' },
  por_vencer: { pill: 'bg-dorado/25 text-[#6b5211] border-dorado', dot: 'bg-dorado', bar: 'bg-dorado' },
  vencido: { pill: 'bg-lacre text-white border-lacre', dot: 'bg-lacre', bar: 'bg-lacre' },
  en_gestion: { pill: 'bg-tinto-600/10 text-tinto-600 border-tinto-600/40 border-dashed', dot: 'bg-tinto-600', bar: 'bg-tinto-600' },
  baja: { pill: 'bg-tinto/5 text-tinto/60 border-tinto/20', dot: 'bg-tinto/30', bar: 'bg-tinto/25' },
};

export const statusDot = (s: DocStatus) => STATUS_STYLE[s].dot;
export const statusBar = (s: DocStatus) => STATUS_STYLE[s].bar;

export function StatusPill({ status, className = '' }: { status: DocStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[13px] font-semibold ${STATUS_STYLE[status].pill} ${className}`} data-status={status}>
      <span className={`h-2 w-2 rounded-full ${status === 'vencido' ? 'bg-white' : STATUS_STYLE[status].dot}`} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- Hoja inferior (modal) ---------- */

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="Cerrar" data-close className="absolute inset-0 bg-tinto/55" onClick={onClose} tabIndex={-1} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animar-subir relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-papel shadow-2xl sm:rounded-2xl"
      >
        <div className="pizarra flex items-center justify-between gap-3 rounded-t-2xl px-4 py-3">
          <h2 id={titleId} className="tiza text-lg font-semibold">{title}</h2>
          <button type="button" data-close onClick={onClose} className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-papel/80 hover:bg-white/10" aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-tinto/10 bg-papel px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Campos ---------- */

function FieldShell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="rotulo">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-[13px] text-tinto/65">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-[13px] font-medium text-lacre" role="alert">{error}</p>}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} className={`campo ${error ? 'campo-error' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...rest} />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select id={id} className={`campo ${error ? 'campo-error' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea id={id} rows={2} className={`campo py-2 ${error ? 'campo-error' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...rest} />
    </FieldShell>
  );
}

export function FormError({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-lacre/40 bg-lacre/10 px-3 py-2 text-sm font-medium text-lacre">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/** Aviso obligatorio en formularios y confirmaciones. */
export function DemoNotice() {
  return (
    <p className="mb-4 rounded-lg border border-dashed border-tinto/30 bg-white/70 px-3 py-2 text-[13px] text-tinto/75">
      <strong className="font-semibold">Demo:</strong> se guarda solo en este navegador. Guardar no contacta al negocio ni a nadie, y no se sincroniza con otros dispositivos.
    </p>
  );
}

export function EmptyState({ icon = 'glass', title, text, action }: { icon?: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="etiqueta mx-auto my-6 flex max-w-sm flex-col items-center px-6 py-8 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-papel text-tinto-600">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-[15px] text-tinto/70">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-baseline justify-between gap-3">
      <h2 className="text-xl font-semibold">{children}</h2>
      {aside}
    </div>
  );
}
