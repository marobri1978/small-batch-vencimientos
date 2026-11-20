import { Link, useSearchParams } from 'react-router-dom';
import { formatMoney, getDocType } from '../domain/catalog';
import { formatLong, formatMonth, monthKey, shiftMonth, weekday, type MonthKey } from '../domain/dates';
import { agendaForMonth, computeStatus, relativeLabel } from '../domain/status';
import { useStore } from '../state/store';
import { PageTitle } from '../components/Layout';
import { EmptyState, Icon, StatusPill, statusDot } from '../components/ui';

const HEAD = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

/**
 * Agenda del mes. El mes visible vive en la URL (?mes=AAAA-MM) y es solo una vista:
 * cambiarlo NO cambia la fecha de hoy ni renueva nada. Los estados se calculan siempre con `today`.
 */
export function AgendaScreen() {
  const { data, today } = useStore();
  const [params, setParams] = useSearchParams();
  const requested = params.get('mes');
  const month: MonthKey = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : monthKey(today);
  const selected = params.get('dia');
  const agenda = agendaForMonth(data, month);
  const isCurrent = month === monthKey(today);

  const go = (m: MonthKey) => {
    const next = new URLSearchParams();
    if (m !== monthKey(today)) next.set('mes', m);
    setParams(next, { replace: true });
  };
  const pick = (date: string) => {
    const next = new URLSearchParams(params);
    if (selected === date) next.delete('dia');
    else next.set('dia', date);
    setParams(next, { replace: true });
  };

  const offset = (weekday(`${month}-01`) + 6) % 7; // lunes primero
  const visibleDocs = selected && selected.startsWith(month) ? agenda.docs.filter((d) => d.expiryDate === selected) : agenda.docs;
  const visibleTotal = visibleDocs.reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <>
      <PageTitle title="Agenda del mes" subtitle={`Los estados se calculan con la fecha de hoy (${formatLong(today)}).`} />

      <div className="etiqueta p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => go(shiftMonth(month, -1))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-papel" aria-label="Mes anterior">
            <Icon name="back" />
          </button>
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold" data-testid="agenda-month">{formatMonth(month)}</h2>
            {!isCurrent && (
              <button type="button" onClick={() => go(monthKey(today))} className="text-[13px] font-medium text-tinto-600 underline underline-offset-2">
                Volver al mes actual
              </button>
            )}
          </div>
          <button type="button" onClick={() => go(shiftMonth(month, 1))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-papel" aria-label="Mes siguiente">
            <Icon name="next" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`Calendario de ${formatMonth(month)}`}>
          {HEAD.map((h) => (
            <div key={h} className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-tinto/55" role="columnheader">{h}</div>
          ))}
          {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
          {agenda.days.map((d) => {
            const isToday = d.date === today;
            const isSel = d.date === selected;
            const has = d.docs.length > 0;
            return (
              <button
                key={d.date}
                type="button"
                role="gridcell"
                onClick={() => has && pick(d.date)}
                disabled={!has}
                aria-label={`${d.day}${has ? `: ${d.docs.length} ${d.docs.length === 1 ? 'vencimiento' : 'vencimientos'}` : ''}${isToday ? ', hoy' : ''}`}
                aria-pressed={has ? isSel : undefined}
                data-testid={`day-${d.date}`}
                className={`flex aspect-square min-h-[42px] flex-col items-center justify-center rounded-lg text-[15px] transition
                  ${isSel ? 'bg-tinto text-papel' : has ? 'bg-papel font-semibold hover:bg-dorado/20' : 'text-tinto/45'}
                  ${isToday && !isSel ? 'ring-2 ring-dorado' : ''}`}
              >
                <span>{d.day}</span>
                {has && (
                  <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
                    {d.docs.slice(0, 3).map((doc) => (
                      <span key={doc.id} className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-papel' : statusDot(computeStatus(doc, today))}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-tinto/65" aria-hidden="true">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-lacre" />Vencido</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-dorado" />Por vencer</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-oliva" />Vigente</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-tinto-600" />En gestión</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded ring-2 ring-dorado" />Hoy</span>
        </p>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{selected && selected.startsWith(month) ? `Vence el ${formatLong(selected)}` : 'Vencimientos del mes'}</h2>
        {selected && selected.startsWith(month) && (
          <button type="button" className="text-sm font-medium text-tinto-600 underline underline-offset-2" onClick={() => pick(selected)}>Ver todo el mes</button>
        )}
      </div>

      {agenda.docs.length === 0 ? (
        <EmptyState icon="cal" title="Mes sin vencimientos" text={`No vence nada en ${formatMonth(month).toLowerCase()}.`} action={<button type="button" className="btn-secundario" onClick={() => go(shiftMonth(month, 1))}>Mirar el mes siguiente</button>} />
      ) : (
        <div className="etiqueta mt-2 overflow-hidden">
          <ul className="divide-y divide-tinto/10" data-testid="agenda-list">
            {visibleDocs.map((d) => {
              const s = computeStatus(d, today);
              const cp = data.counterparties.find((c) => c.id === d.counterpartyId);
              return (
                <li key={d.id}>
                  <Link to={`/documentos/${d.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-papel/50" data-testid={`agenda-${d.id}`}>
                    <span className="w-9 shrink-0 text-center">
                      <span className="block font-display text-xl font-bold leading-none">{Number(d.expiryDate.slice(8))}</span>
                      <span className="text-[11px] uppercase text-tinto/55">{HEAD[(weekday(d.expiryDate) + 6) % 7]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">{d.title}</span>
                      <span className="block truncate text-[13px] text-tinto/65">{cp?.name} · {getDocType(d.typeId).shortName}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusPill status={s} />
                        <span className="text-[13px] text-tinto/70">{relativeLabel(d, today)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums">{d.amount == null ? <span className="text-[13px] font-normal text-tinto/55">Sin monto</span> : formatMoney(d.amount)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-dashed border-tinto/20 bg-papel/60 px-4 py-3">
            <span className="font-display text-lg font-semibold">{selected && selected.startsWith(month) ? 'Total del día' : 'Total del mes'}</span>
            <span className="font-display text-xl font-bold tabular-nums" data-testid="agenda-total">{formatMoney(selected && selected.startsWith(month) ? visibleTotal : agenda.total)}</span>
          </div>
          <p className="px-4 pb-3 text-[12px] text-tinto/60 bg-papel/60">
            Suma de los montos de {selected && selected.startsWith(month) ? 'ese día' : `los ${agenda.docs.length} vencimientos del mes`}. Los dados de baja no cuentan; los «Sin monto» suman $ 0.
          </p>
        </div>
      )}
    </>
  );
}
