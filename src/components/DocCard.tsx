import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney, getDocType } from '../domain/catalog';
import { formatShort } from '../domain/dates';
import { computeStatus, isPriceListBlocked, relativeLabel } from '../domain/status';
import type { DocumentRecord } from '../domain/types';
import { useStore } from '../state/store';
import { ManageSheet, RemoveDocSheet, RenewSheet } from './sheets';
import { Icon, StatusPill, statusBar } from './ui';

export type DocSheetKind = 'renew' | 'manage' | 'remove';

/** Abre las hojas de acción de un documento desde cualquier pantalla. */
export function useDocSheets() {
  const [open, setOpen] = useState<{ kind: DocSheetKind; doc: DocumentRecord } | null>(null);
  const close = () => setOpen(null);
  let element: ReactNode = null;
  if (open?.kind === 'renew') element = <RenewSheet doc={open.doc} onClose={close} />;
  if (open?.kind === 'manage') element = <ManageSheet doc={open.doc} onClose={close} />;
  if (open?.kind === 'remove') element = <RemoveDocSheet doc={open.doc} onClose={close} />;
  return { openSheet: (kind: DocSheetKind, doc: DocumentRecord) => setOpen({ kind, doc }), element };
}

export function NoSellBanner({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center gap-2 rounded-md bg-lacre px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white ${className}`} role="note">
      <Icon name="alert" className="h-4 w-4 shrink-0" />
      No vender con esta lista
    </p>
  );
}

export function DocCard({ doc, footer, showCounterparty = true }: { doc: DocumentRecord; footer?: ReactNode; showCounterparty?: boolean }) {
  const { data, today } = useStore();
  const status = computeStatus(doc, today);
  const cp = data.counterparties.find((c) => c.id === doc.counterpartyId);
  const type = getDocType(doc.typeId);
  const relative = status === 'baja' ? 'Ya no aplica' : relativeLabel(doc, today);

  return (
    <article className="etiqueta relative overflow-hidden" data-testid={`doc-${doc.id}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${statusBar(status)}`} aria-hidden="true" />
      <Link to={`/documentos/${doc.id}`} className="block px-4 pb-3 pl-5 pt-3 hover:bg-papel/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-tinto/55">{type.shortName}</p>
            <h3 className="font-display text-[17px] font-semibold leading-snug">{doc.title}</h3>
            {showCounterparty && cp && <p className="truncate text-sm text-tinto/70">{cp.name}</p>}
          </div>
          <StatusPill status={status} className="mt-0.5" />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className={`text-[15px] font-semibold ${status === 'vencido' ? 'text-lacre' : status === 'por_vencer' ? 'text-[#7a5c0e]' : ''}`}>{relative}</p>
          <p className="text-sm text-tinto/65">{formatShort(doc.expiryDate)} · {formatMoney(doc.amount)}</p>
        </div>
        {status === 'en_gestion' && <p className="mt-1 text-[13px] text-tinto-600">Trámite iniciado: no suma en los avisos.</p>}
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-tinto/65">
          <Icon name="pin" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{doc.location}</span>
        </p>
        {isPriceListBlocked(doc, today) && <NoSellBanner className="mt-2" />}
      </Link>
      {footer && <div className="flex flex-wrap gap-2 border-t border-tinto/10 bg-papel/50 px-4 py-2.5 pl-5">{footer}</div>}
    </article>
  );
}
