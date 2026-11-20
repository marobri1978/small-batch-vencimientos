import { Link } from 'react-router-dom';
import { markSeen } from '../domain/actions';
import { formatShort } from '../domain/dates';
import { getAlerts, urgencyCounters } from '../domain/status';
import { useStore } from '../state/store';
import { DocCard, useDocSheets } from '../components/DocCard';
import { PageTitle } from '../components/Layout';
import { EmptyState, Icon, SectionTitle } from '../components/ui';

export function AlertsScreen() {
  const { data, today, commit } = useStore();
  const alerts = getAlerts(data, today);
  const unseen = alerts.filter((a) => a.unseen);
  const seen = alerts.filter((a) => !a.unseen);
  const counters = urgencyCounters(data, today);
  const { openSheet, element } = useDocSheets();

  const counterLinks = [
    { key: 'vencido', label: 'Vencidos', value: counters.vencido, cls: 'bg-lacre text-white' },
    { key: 'por_vencer', label: 'Por vencer', value: counters.por_vencer, cls: 'bg-dorado text-tinto' },
    { key: 'en_gestion', label: 'En gestión', value: counters.en_gestion, cls: 'bg-white text-tinto-600 border border-dashed border-tinto-600/50' },
  ];

  return (
    <>
      <PageTitle
        title="Avisos de hoy"
        subtitle={
          unseen.length
            ? `${unseen.length} ${unseen.length === 1 ? 'aviso sin ver' : 'avisos sin ver'}. Llamá a quien corresponda y marcá lo que ya está en gestión.`
            : 'Sin avisos nuevos.'
        }
      />

      <div className="grid grid-cols-3 gap-2" aria-label="Contadores">
        {counterLinks.map((c) => (
          <Link key={c.key} to={`/documentos?estado=${c.key}`} className={`rounded-xl px-2 py-3 text-center shadow-sm ${c.cls}`} data-testid={`counter-${c.key}`}>
            <span className="block font-display text-[28px] font-bold leading-none">{c.value}</span>
            <span className="mt-1 block text-[12px] font-semibold uppercase tracking-wide">{c.label}</span>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-tinto/60">Vencidos y Por vencer son los contadores de urgencia. En gestión va aparte.</p>

      {unseen.length === 0 ? (
        <EmptyState
          icon="check"
          title="Todo en orden por hoy"
          text={seen.length ? 'Ya viste todos los avisos. Si algo cambia, vuelve a aparecer acá.' : 'No hay nada que vencer en los próximos días.'}
          action={<Link to="/agenda" className="btn-secundario">Ver la agenda del mes</Link>}
        />
      ) : (
        <>
          <SectionTitle>Sin ver</SectionTitle>
          <ul className="space-y-3">
            {unseen.map((a) => {
              const cp = data.counterparties.find((c) => c.id === a.doc.counterpartyId);
              return (
                <li key={a.doc.id}>
                  <DocCard
                    doc={a.doc}
                    footer={
                      <>
                        {cp?.contact && (
                          <p className="mb-1 flex w-full items-start gap-1.5 text-[13px] text-tinto/75">
                            <Icon name="phone" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span><Link to={`/contrapartes/${cp.id}`} className="font-semibold underline decoration-dorado underline-offset-2">{cp.name}</Link>: {cp.contact}</span>
                          </p>
                        )}
                        <button
                          type="button"
                          className="btn-secundario btn-chico"
                          onClick={() => commit(markSeen(data, a.doc.id, today), 'Listo: no suma hasta dentro de 3 días.')}
                        >
                          <Icon name="eye" className="h-4 w-4" /> Ya lo vi
                        </button>
                        <button type="button" className="btn-secundario btn-chico" onClick={() => openSheet('manage', a.doc)}>
                          <Icon name="wrench" className="h-4 w-4" /> En gestión
                        </button>
                        <button type="button" className="btn-primario btn-chico" onClick={() => openSheet('renew', a.doc)}>
                          <Icon name="refresh" className="h-4 w-4" /> Renovar
                        </button>
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {seen.length > 0 && (
        <>
          <SectionTitle>Ya vistos</SectionTitle>
          <ul className="space-y-3">
            {seen.map((a) => (
              <li key={a.doc.id} className="opacity-90">
                <DocCard
                  doc={a.doc}
                  footer={
                    <>
                      <p className="w-full text-[13px] text-tinto/70">Visto. Vuelve a avisar el {formatShort(a.returnsOn!)}, o antes si vence.</p>
                      <button type="button" className="btn-secundario btn-chico" onClick={() => openSheet('manage', a.doc)}>
                        <Icon name="wrench" className="h-4 w-4" /> En gestión
                      </button>
                      <button type="button" className="btn-primario btn-chico" onClick={() => openSheet('renew', a.doc)}>
                        <Icon name="refresh" className="h-4 w-4" /> Renovar
                      </button>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {counters.en_gestion > 0 && (
        <Link to="/documentos?estado=en_gestion" className="etiqueta mt-6 flex items-center justify-between gap-3 px-4 py-3 text-[15px] font-medium">
          <span>{counters.en_gestion} {counters.en_gestion === 1 ? 'documento en gestión' : 'documentos en gestión'}</span>
          <Icon name="next" />
        </Link>
      )}
      {element}
    </>
  );
}
