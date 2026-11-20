import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDocType } from '../domain/catalog';
import { computeStatus, sortByUrgency } from '../domain/status';
import type { DocStatus } from '../domain/types';
import { useStore } from '../state/store';
import { DocCard } from '../components/DocCard';
import { PageTitle } from '../components/Layout';
import { DocumentFormSheet } from '../components/sheets';
import { EmptyState, Icon } from '../components/ui';

type Filter = 'activos' | DocStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'activos', label: 'Activos' },
  { key: 'vencido', label: 'Vencidos' },
  { key: 'por_vencer', label: 'Por vencer' },
  { key: 'vigente', label: 'Vigentes' },
  { key: 'en_gestion', label: 'En gestión' },
  { key: 'baja', label: 'Dados de baja' },
];

const EMPTY: Record<Filter, { title: string; text: string }> = {
  activos: { title: 'Todavía no hay documentos', text: 'Cargá el primero: habilitación, seguro, una lista de precios…' },
  vencido: { title: 'Nada vencido', text: 'Ningún documento tiene la fecha pasada.' },
  por_vencer: { title: 'Nada por vencer', text: 'Ningún documento está dentro de sus días de aviso.' },
  vigente: { title: 'Ninguno vigente', text: 'Todos los documentos activos necesitan atención o están en gestión.' },
  en_gestion: { title: 'Nada en gestión', text: 'Cuando empieces un trámite, marcalo En gestión desde el aviso.' },
  baja: { title: 'Nada dado de baja', text: 'Acá quedan los documentos que ya no aplican.' },
};

export function DocumentsScreen() {
  const { data, today } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = (FILTERS.some((f) => f.key === params.get('estado')) ? params.get('estado') : 'activos') as Filter;
  const creating = params.get('nuevo') === '1';
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { activos: 0, vigente: 0, por_vencer: 0, vencido: 0, en_gestion: 0, baja: 0 };
    for (const d of data.documents) {
      const s = computeStatus(d, today);
      c[s] += 1;
      if (s !== 'baja') c.activos += 1;
    }
    return c;
  }, [data.documents, today]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.documents.filter((d) => {
      const s = computeStatus(d, today);
      if (filter === 'activos' ? s === 'baja' : s !== filter) return false;
      if (!q) return true;
      const cp = data.counterparties.find((c) => c.id === d.counterpartyId);
      return [d.title, d.location, cp?.name ?? '', getDocType(d.typeId).name].some((t) => t.toLowerCase().includes(q));
    });
    return sortByUrgency(filtered, today);
  }, [data, filter, query, today]);

  const setFilter = (key: Filter) => {
    const next = new URLSearchParams(params);
    if (key === 'activos') next.delete('estado');
    else next.set('estado', key);
    setParams(next, { replace: true });
  };

  const setCreating = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set('nuevo', '1');
    else next.delete('nuevo');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageTitle title="Documentos" subtitle={`${counts.activos} activos · ordenados por urgencia`} />

      <div className="relative mb-3">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-tinto/45" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, contraparte o carpeta"
          aria-label="Buscar documentos"
          className="campo mt-0 pl-10"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 lg:grid-cols-6" role="tablist" aria-label="Filtrar por estado">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`chip w-full justify-center ${active ? 'border-tinto bg-tinto text-papel' : 'border-tinto/20 bg-white text-tinto'}`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[12px] ${active ? 'bg-white/20' : 'bg-papel'}`}>{counts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        query ? (
          <EmptyState icon="search" title="Sin resultados" text={`No hay documentos que coincidan con «${query}» en este filtro.`} action={<button type="button" className="btn-secundario" onClick={() => setQuery('')}>Borrar búsqueda</button>} />
        ) : (
          <EmptyState
            icon="doc"
            title={EMPTY[filter].title}
            text={EMPTY[filter].text}
            action={filter === 'activos' ? <button type="button" className="btn-primario" onClick={() => setCreating(true)}>Cargar documento</button> : <button type="button" className="btn-secundario" onClick={() => setFilter('activos')}>Ver activos</button>}
          />
        )
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((d) => (
            <li key={d.id}><DocCard doc={d} /></li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="btn-primario fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-20 h-14 rounded-full px-5 shadow-lg min-[700px]:right-[calc(50%-320px)] lg:right-[calc(50%-496px)]"
      >
        <Icon name="plus" /> Nuevo
      </button>

      {creating && <DocumentFormSheet onClose={() => setCreating(false)} onCreated={(id) => navigate(`/documentos/${id}`)} />}
    </>
  );
}
