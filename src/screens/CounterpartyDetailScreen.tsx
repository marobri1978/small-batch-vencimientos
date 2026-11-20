import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { reactivateCounterparty, removeCounterparty } from '../domain/actions';
import { KIND_LABEL } from '../domain/catalog';
import { formatLong } from '../domain/dates';
import { activeDocsOf, sortByUrgency } from '../domain/status';
import { useStore } from '../state/store';
import { DocCard } from '../components/DocCard';
import { PageTitle } from '../components/Layout';
import { ConfirmSheet, CounterpartyFormSheet, DocumentFormSheet } from '../components/sheets';
import { EmptyState, FormError, Icon, SectionTitle } from '../components/ui';

export function CounterpartyDetailScreen() {
  const { id } = useParams();
  const { data, today, commit } = useStore();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<'edit' | 'doc' | 'remove' | null>(null);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  const [showRemovedDocs, setShowRemovedDocs] = useState(false);
  const cp = data.counterparties.find((c) => c.id === id);

  if (!cp) {
    return <EmptyState icon="people" title="No encontramos esa contraparte" text="Puede que se hayan reiniciado los datos de ejemplo." action={<Link to="/contrapartes" className="btn-primario">Ver contrapartes</Link>} />;
  }

  const active = sortByUrgency(activeDocsOf(data, cp.id), today);
  const removed = data.documents.filter((d) => d.counterpartyId === cp.id && d.status === 'baja');

  const askRemove = () => {
    if (active.length) {
      setBlockMsg(`No se puede dar de baja: tiene ${active.length} ${active.length === 1 ? 'documento activo' : 'documentos activos'}. Primero dalos de baja desde cada documento.`);
      return;
    }
    setBlockMsg(null);
    setSheet('remove');
  };

  return (
    <>
      <PageTitle title={cp.name} back={{ to: '/contrapartes', label: 'Contrapartes' }} subtitle={`${KIND_LABEL[cp.kind]}${cp.status === 'baja' ? ` · dada de baja el ${formatLong(cp.removedAt!)}` : ''}`} />

      <section className="etiqueta px-4 py-4">
        {cp.contact && (
          <p className="flex items-start gap-2 text-[15px]"><Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0" />{cp.contact}</p>
        )}
        {cp.notes && <p className="mt-2 text-[15px] text-tinto/75">{cp.notes}</p>}
        {!cp.contact && !cp.notes && <p className="text-[15px] text-tinto/60">Sin datos de contacto cargados.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {cp.status === 'activa' ? (
            <>
              <button type="button" className="btn-primario btn-chico" onClick={() => setSheet('doc')}><Icon name="plus" className="h-4 w-4" /> Agregar documento</button>
              <button type="button" className="btn-secundario btn-chico" onClick={() => setSheet('edit')}><Icon name="edit" className="h-4 w-4" /> Editar</button>
              <button type="button" className="btn btn-peligro btn-chico" onClick={askRemove}><Icon name="trash" className="h-4 w-4" /> Dar de baja</button>
            </>
          ) : (
            <button type="button" className="btn-secundario btn-chico" onClick={() => commit(reactivateCounterparty(data, cp.id), 'Contraparte activa de nuevo.')}>
              <Icon name="undo" className="h-4 w-4" /> Reactivar
            </button>
          )}
        </div>
      </section>

      {blockMsg && <div className="mt-3"><FormError text={blockMsg} /></div>}

      <SectionTitle aside={<span className="text-sm text-tinto/60">{active.length}</span>}>Documentos activos</SectionTitle>
      {active.length === 0 ? (
        <EmptyState icon="doc" title="Sin documentos activos" text={cp.status === 'activa' ? 'Esta contraparte no tiene papeles que venzan.' : 'Está dada de baja.'} action={cp.status === 'activa' ? <button type="button" className="btn-secundario" onClick={() => setSheet('doc')}>Agregar documento</button> : undefined} />
      ) : (
        <ul className="space-y-3">
          {active.map((d) => <li key={d.id}><DocCard doc={d} showCounterparty={false} /></li>)}
        </ul>
      )}

      {removed.length > 0 && (
        <>
          <button type="button" className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-tinto/70 underline decoration-dorado underline-offset-4" onClick={() => setShowRemovedDocs((s) => !s)} aria-expanded={showRemovedDocs}>
            {showRemovedDocs ? 'Ocultar' : 'Ver'} {removed.length} {removed.length === 1 ? 'dado de baja' : 'dados de baja'}
          </button>
          {showRemovedDocs && (
            <ul className="mt-2 space-y-3">
              {removed.map((d) => <li key={d.id}><DocCard doc={d} showCounterparty={false} /></li>)}
            </ul>
          )}
        </>
      )}

      {sheet === 'edit' && <CounterpartyFormSheet existing={cp} onClose={() => setSheet(null)} />}
      {sheet === 'doc' && <DocumentFormSheet presetCounterpartyId={cp.id} onClose={() => setSheet(null)} onCreated={(docId) => navigate(`/documentos/${docId}`)} />}
      {sheet === 'remove' && (
        <ConfirmSheet
          title="Dar de baja contraparte"
          text={`${cp.name} deja de aparecer entre las activas. Sus documentos dados de baja se conservan. Podés reactivarla después.`}
          confirmLabel="Dar de baja"
          danger
          onConfirm={() => {
            const r = commit(removeCounterparty(data, cp.id, today), 'Contraparte dada de baja.');
            if (!r.ok) setBlockMsg(r.errors.form ?? 'No se pudo dar de baja.');
            return r.ok;
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
