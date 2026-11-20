import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { formatLong } from '../domain/dates';
import { badgeCount } from '../domain/status';
import { useStore } from '../state/store';
import { ConfirmSheet } from './sheets';
import { Icon, type IconName } from './ui';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Avisos', icon: 'bell', end: true },
  { to: '/documentos', label: 'Documentos', icon: 'doc' },
  { to: '/agenda', label: 'Agenda', icon: 'cal' },
  { to: '/contrapartes', label: 'Contrapartes', icon: 'people' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { data, today, reset, toasts, dismissToast } = useStore();
  const count = badgeCount(data, today);
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col lg:max-w-5xl">
      <header className="pizarra sticky top-0 z-30 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-md">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dorado">Espacio Small Batch</p>
            <p className="tiza truncate font-display text-[22px] font-semibold leading-tight">Vencimientos</p>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
              aria-label={count > 0 ? `Avisos sin ver: ${count}` : 'Avisos: todo en orden'}
              data-testid="header-bell"
            >
              <Icon name="bell" className="h-6 w-6" />
              {count > 0 && (
                <span data-testid="header-badge" className="absolute -right-0.5 -top-0.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-tinto bg-lacre px-1 text-[12px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label="Más opciones" aria-expanded={menu}>
                <Icon name="menu" className="h-6 w-6" />
              </button>
              {menu && (
                <>
                  <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Cerrar menú" tabIndex={-1} onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl bg-white text-tinto shadow-xl ring-1 ring-tinto/10">
                    <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] hover:bg-papel" onClick={() => { setMenu(false); navigate('/documentos?nuevo=1'); }}>
                      <Icon name="plus" /> Nuevo documento
                    </button>
                    <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] hover:bg-papel" onClick={() => { setMenu(false); navigate('/contrapartes?nueva=1'); }}>
                      <Icon name="people" /> Nueva contraparte
                    </button>
                    <button type="button" className="flex w-full items-center gap-3 border-t border-tinto/10 px-4 py-3 text-left text-[15px] text-lacre hover:bg-papel" onClick={() => { setMenu(false); setConfirmReset(true); }}>
                      <Icon name="refresh" /> Reiniciar datos de ejemplo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-papel/75">Hoy es {formatLong(today)}</p>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-tinto/15 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Secciones">
        <ul className="mx-auto grid max-w-2xl grid-cols-4 lg:max-w-5xl">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${isActive ? 'text-tinto' : 'text-tinto/55'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-0 h-1 w-10 rounded-b bg-dorado" aria-hidden="true" />}
                    <span className="relative">
                      <Icon name={n.icon} className="h-6 w-6" />
                      {n.to === '/' && count > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-lacre" aria-hidden="true" />}
                    </span>
                    {n.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`animar-subir pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl px-4 py-3 text-[15px] shadow-lg ${t.kind === 'ok' ? 'bg-oliva text-white' : 'bg-lacre text-white'}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <Icon name={t.kind === 'ok' ? 'check' : 'alert'} className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="flex-1">{t.text}</span>
            <button type="button" onClick={() => dismissToast(t.id)} aria-label="Cerrar aviso" className="-mr-1 grid h-7 w-7 place-items-center rounded-full hover:bg-white/15">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {confirmReset && (
        <ConfirmSheet
          title="Reiniciar datos de ejemplo"
          text="Se borran los cambios hechos en este navegador y se vuelven a cargar las 9 contrapartes y los 15 documentos de ejemplo, con fechas calculadas desde hoy."
          confirmLabel="Reiniciar"
          danger
          onConfirm={() => {
            const ok = reset();
            if (ok) navigate('/');
            return ok;
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

export function PageTitle({ title, subtitle, back }: { title: string; subtitle?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-4">
      {back && (
        <Link to={back.to} className="-ml-2 mb-1 inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-tinto/70 hover:text-tinto">
          <Icon name="back" className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <h1 className="subrayado-tiza inline text-[28px] font-semibold leading-tight">{title}</h1>
      {subtitle && <div className="mt-1 text-[15px] text-tinto/70">{subtitle}</div>}
    </div>
  );
}
