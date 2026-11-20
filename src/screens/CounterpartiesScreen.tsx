import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KIND_PLURAL } from '../domain/catalog';
import { activeDocsOf, worstStatus } from '../domain/status';
import type { CounterpartyKind } from '../domain/types';
import { useStore } from '../state/store';
import { PageTitle } from '../components/Layout';
import { CounterpartyFormSheet } from '../components/sheets';
import { EmptyState, Icon, SectionTitle, StatusPill } from '../components/ui';

const ORDER: CounterpartyKind[] = ['local', 'productor', 'distribuidor', 'servicio'];

export function CounterpartiesScreen() {
  const { data, today } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const showRemoved = params.get('ver') === 'bajas';
  const creating = params.get('nueva') === '1';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = data.counterparties.filter((c) => (showRemoved ? c.status === 'baja' : c.status === 'activa'));
  const removedCount = data.counterparties.filter((c) => c.status === 'baja').length;
  const activeCount = data.counterparties.length - removedCount;

  return (
    <>
      <PageTitle title="Contrapartes" subtitle="El local, productores, distribuidores y servicios." />

      <div className="mb-2 flex gap-2" role="tablist" aria-label="Filtrar contrapartes">
        <button type="button" role="tab" aria-selected={!showRemoved} onClick={() => setParam('ver', null)} className={`chip ${!showRemoved ? 'border-tinto bg-tinto text-papel' : 'border-tinto/20 bg-white'}`}>
          Activas <span className="rounded-full bg-white/20 px-1.5 text-[12px]">{activeCount}</span>
        </button>
        <button type="button" role="tab" aria-selected={showRemoved} onClick={() => setParam('ver', 'bajas')} className={`chip ${showRemoved ? 'border-tinto bg-tinto text-papel' : 'border-tinto/20 bg-white'}`}>
          Dadas de baja <span className="rounded-full bg-papel/60 px-1.5 text-[12px]">{removedCount}</span>
        </button>
      </div>

      {list.length === 0 ? (
        showRemoved ? (
          <EmptyState icon="people" title="Ninguna dada de baja" text="Las contrapartes que ya no trabajan con el local quedan acá." action={<button type="button" className="btn-secundario" onClick={() => setParam('ver', null)}>Ver activas</button>} />
        ) : (
          <EmptyState icon="people" title="Sin contrapartes" text="Cargá el local, un productor o un distribuidor para empezar." action={<button type="button" className="btn-primario" onClick={() => setParam('nueva', '1')}>Nueva contraparte</button>} />
        )
      ) : (
        ORDER.map((kind) => {
          const group = list.filter((c) => c.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
          if (!group.length) return null;
          return (
            <section key={kind}>
              <SectionTitle>{KIND_PLURAL[kind]}</SectionTitle>
              <ul className="etiqueta divide-y divide-tinto/10">
                {group.map((c) => {
                  const docs = activeDocsOf(data, c.id);
                  const worst = worstStatus(docs, today);
                  return (
                    <li key={c.id}>
                      <Link to={`/contrapartes/${c.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-papel/50">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-[17px] font-semibold leading-snug">{c.name}</p>
                          <p className="text-sm text-tinto/65">
                            {c.status === 'baja' ? 'Dada de baja' : docs.length === 0 ? 'Sin documentos activos' : `${docs.length} ${docs.length === 1 ? 'documento activo' : 'documentos activos'}`}
                          </p>
                        </div>
                        {worst && worst !== 'vigente' && <StatusPill status={worst} />}
                        <Icon name="next" className="h-5 w-5 shrink-0 text-tinto/40" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <button
        type="button"
        onClick={() => setParam('nueva', '1')}
        className="btn-primario fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-20 h-14 rounded-full px-5 shadow-lg min-[700px]:right-[calc(50%-320px)]"
      >
        <Icon name="plus" /> Nueva
      </button>

      {creating && <CounterpartyFormSheet onClose={() => setParam('nueva', null)} onSaved={(id) => navigate(`/contrapartes/${id}`)} />}
    </>
  );
}
