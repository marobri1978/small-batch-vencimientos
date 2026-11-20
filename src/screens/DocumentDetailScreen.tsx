import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { endManagement, markSeen } from '../domain/actions';
import { KIND_LABEL, durationLabel, formatMoney, getDocType } from '../domain/catalog';
import { formatLong, formatShort } from '../domain/dates';
import { alertFor, computeStatus, daysLeft, isPriceListBlocked, relativeLabel } from '../domain/status';
import type { HistoryKind } from '../domain/types';
import { useStore } from '../state/store';
import { NoSellBanner, useDocSheets } from '../components/DocCard';
import { PageTitle } from '../components/Layout';
import { ConfirmSheet, DocumentEditSheet } from '../components/sheets';
import { EmptyState, Icon, SectionTitle, StatusPill, statusBar, type IconName } from '../components/ui';

const HISTORY_ICON: Record<HistoryKind, IconName> = {
  alta: 'plus',
  renovacion: 'refresh',
  en_gestion: 'wrench',
  fin_gestion: 'undo',
  visto: 'eye',
  baja: 'trash',
  edicion: 'edit',
};

export function DocumentDetailScreen() {
  const { id } = useParams();
  const { data, today, commit } = useStore();
  const { openSheet, element } = useDocSheets();
  const [editing, setEditing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const doc = data.documents.find((d) => d.id === id);

  if (!doc) {
    return (
      <EmptyState icon="doc" title="No encontramos ese documento" text="Puede que se hayan reiniciado los datos de ejemplo." action={<Link to="/documentos" className="btn-primario">Ver documentos</Link>} />
    );
  }

  const type = getDocType(doc.typeId);
  const cp = data.counterparties.find((c) => c.id === doc.counterpartyId);
  const status = computeStatus(doc, today);
  const alert = alertFor(doc, today);
  const left = daysLeft(doc, today);

  return (
    <>
      <PageTitle title={doc.title} back={{ to: '/documentos', label: 'Documentos' }} subtitle={type.name} />

      <section className="etiqueta relative overflow-hidden px-4 py-4 pl-5" data-testid="doc-detail">
        <span className={`absolute inset-y-0 left-0 w-1.5 ${statusBar(status)}`} aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusPill status={status} className="text-[14px]" />
          <span className="text-[13px] text-tinto/60">{doc.id}</span>
        </div>
        <p className={`mt-3 font-display text-[26px] font-bold leading-tight ${status === 'vencido' ? 'text-lacre' : ''}`}>
          {status === 'baja' ? 'Ya no aplica' : relativeLabel(doc, today)}
        </p>
        <p className="text-[15px] text-tinto/75">Vence el {formatLong(doc.expiryDate)}</p>
        {status === 'en_gestion' && (
          <p className="mt-2 rounded-lg border border-dashed border-tinto-600/40 bg-tinto-600/5 px-3 py-2 text-sm text-tinto-600">
            En gestión: conserva la fecha {left < 0 ? '(ya pasó) ' : ''}y no suma en los avisos ni en los contadores de urgencia.
          </p>
        )}
        {isPriceListBlocked(doc, today) && <NoSellBanner className="mt-3" />}
        {alert && (
          <p className="mt-2 text-[13px] text-tinto/70">
            {alert.unseen ? 'Aviso activo: suma en la marca del encabezado.' : `Aviso visto. Vuelve a contar el ${formatShort(alert.returnsOn!)} o si vence antes.`}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-tinto/10 pt-4 text-[15px] min-[400px]:grid-cols-2">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">Contraparte</dt>
            <dd>{cp ? <Link to={`/contrapartes/${cp.id}`} className="font-medium underline decoration-dorado underline-offset-2">{cp.name}</Link> : '—'}{cp && <span className="text-tinto/60"> · {KIND_LABEL[cp.kind]}</span>}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">Rige desde</dt>
            <dd>{formatLong(doc.startDate)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">Monto</dt>
            <dd>{formatMoney(doc.amount)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">Regla</dt>
            <dd>Dura {durationLabel(type)} · avisa {type.warnDays} días antes</dd>
          </div>
          <div className="min-[400px]:col-span-2">
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">Dónde está el original</dt>
            <dd className="flex items-start gap-1.5"><Icon name="pin" className="mt-1 h-4 w-4 shrink-0" />{doc.location}</dd>
          </div>
          {doc.notes && (
            <div className="min-[400px]:col-span-2">
              <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">Notas</dt>
              <dd>{doc.notes}</dd>
            </div>
          )}
          {cp?.contact && (
            <div className="min-[400px]:col-span-2">
              <dt className="text-[12px] font-semibold uppercase tracking-wide text-tinto/55">A quién llamar</dt>
              <dd className="flex items-start gap-1.5"><Icon name="phone" className="mt-1 h-4 w-4 shrink-0" />{cp.contact}</dd>
            </div>
          )}
        </dl>
      </section>

      {status !== 'baja' && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-primario col-span-2" onClick={() => openSheet('renew', doc)}>
            <Icon name="refresh" /> Renovar
          </button>
          {alert?.unseen && (
            <button type="button" className="btn-secundario" onClick={() => commit(markSeen(data, doc.id, today), 'Listo: no suma hasta dentro de 3 días.')}>
              <Icon name="eye" /> Ya lo vi
            </button>
          )}
          {doc.status === 'activo' ? (
            <button type="button" className="btn-secundario" onClick={() => openSheet('manage', doc)}>
              <Icon name="wrench" /> En gestión
            </button>
          ) : (
            <button type="button" className="btn-secundario" onClick={() => setConfirmEnd(true)}>
              <Icon name="undo" /> Quitar de gestión
            </button>
          )}
          <button type="button" className="btn-secundario" onClick={() => setEditing(true)}>
            <Icon name="edit" /> Editar datos
          </button>
          <button type="button" className="btn btn-peligro" onClick={() => openSheet('remove', doc)}>
            <Icon name="trash" /> Dar de baja
          </button>
        </div>
      )}

      <SectionTitle aside={<span className="text-sm text-tinto/60">{doc.history.length} {doc.history.length === 1 ? 'línea' : 'líneas'}</span>}>Historial</SectionTitle>
      <ol className="etiqueta divide-y divide-tinto/10" data-testid="history">
        {[...doc.history].reverse().map((h) => (
          <li key={h.id} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-papel text-tinto-600">
              <Icon name={HISTORY_ICON[h.kind]} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-tinto/60">{formatShort(h.date)}</p>
              <p className="text-[15px]">{h.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {editing && <DocumentEditSheet doc={doc} onClose={() => setEditing(false)} />}
      {confirmEnd && (
        <ConfirmSheet
          title="Quitar de gestión"
          text="El documento vuelve a calcular su estado por la fecha y, si corresponde, vuelve a avisar. Usalo si el trámite se frenó; si ya se resolvió, mejor «Renovar»."
          confirmLabel="Quitar de gestión"
          onConfirm={() => commit(endManagement(data, doc.id, today), 'Salió de En gestión.').ok}
          onClose={() => setConfirmEnd(false)}
        />
      )}
      {element}
    </>
  );
}
