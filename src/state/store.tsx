import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { businessToday, type ISODate } from '../domain/dates';
import type { ActionResult, FieldErrors } from '../domain/actions';
import type { AppData } from '../domain/types';
import { loadData, resetData, saveData } from './storage';

/* ---------- Fecha de referencia ---------- */

const TodayContext = createContext<ISODate>(businessToday());

/**
 * Única fuente de "hoy" para lista, avisos y agenda.
 * En la app normal es la fecha actual del negocio (hora de Argentina) y se actualiza sola a medianoche.
 * Las pruebas pasan `fixedToday`. No hay pantalla para cambiar el reloj.
 */
export function TodayProvider({ fixedToday, children }: { fixedToday?: ISODate; children: ReactNode }) {
  const [today, setToday] = useState<ISODate>(() => fixedToday ?? businessToday());
  useEffect(() => {
    if (fixedToday) return;
    const tick = () => setToday((prev) => {
      const now = businessToday();
      return now === prev ? prev : now;
    });
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fixedToday]);
  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}

export const useToday = () => useContext(TodayContext);

/* ---------- Datos ---------- */

export interface Toast {
  id: number;
  kind: 'ok' | 'error';
  text: string;
}

interface StoreValue {
  data: AppData;
  today: ISODate;
  /**
   * Aplica una acción: valida, GUARDA y recién después actualiza la pantalla.
   * Devuelve los errores para que el formulario los muestre sin perder lo escrito.
   */
  commit: (result: ActionResult, successText: string) => { ok: true; id?: string } | { ok: false; errors: FieldErrors };
  reset: () => boolean;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  notify: (kind: Toast['kind'], text: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export const SAVE_ERROR = 'No se pudo guardar en este navegador. Lo que escribiste sigue acá: probá de nuevo.';

export function StoreProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  const initial = useRef(loadData(today));
  const [data, setData] = useState<AppData>(initial.current.data);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToast = useRef(1);

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    const id = nextToast.current++;
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);

  useEffect(() => {
    if (initial.current.warning) notify('error', initial.current.warning);
  }, [notify]);

  const commit = useCallback<StoreValue['commit']>(
    (result, successText) => {
      if (!result.ok) return result;
      if (!saveData(result.data)) {
        notify('error', SAVE_ERROR);
        return { ok: false, errors: { form: SAVE_ERROR } };
      }
      setData(result.data);
      notify('ok', successText);
      return { ok: true, id: result.id };
    },
    [notify],
  );

  const reset = useCallback(() => {
    const fresh = resetData(today);
    if (!fresh) {
      notify('error', SAVE_ERROR);
      return false;
    }
    setData(fresh);
    notify('ok', 'Datos de ejemplo cargados de nuevo.');
    return true;
  }, [today, notify]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const value = useMemo(
    () => ({ data, today, commit, reset, toasts, dismissToast, notify }),
    [data, today, commit, reset, toasts, dismissToast, notify],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore fuera de StoreProvider');
  return v;
}
