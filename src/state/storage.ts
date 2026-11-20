import { buildSeed } from '../domain/seed';
import type { AppData } from '../domain/types';
import type { ISODate } from '../domain/dates';

/** Clave propia de la app. La semilla se carga solo si esta clave no existe. */
export const STORAGE_KEY = 'small-batch-vencimientos:v1';
const BACKUP_KEY = `${STORAGE_KEY}:copia-danada`;

export interface LoadResult {
  data: AppData;
  seeded: boolean;
  warning?: string;
}

function isAppData(value: unknown): value is AppData {
  const v = value as AppData;
  return !!v && v.version === 1 && Array.isArray(v.documents) && Array.isArray(v.counterparties) && !!v.counters;
}

export function loadData(today: ISODate, storage: Storage = window.localStorage): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: buildSeed(today), seeded: true, warning: 'Este navegador no deja guardar datos. Los cambios se pierden al cerrar.' };
  }
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (isAppData(parsed)) return { data: parsed, seeded: false };
    } catch {
      /* sigue abajo */
    }
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      /* sin lugar para la copia */
    }
  }
  const data = buildSeed(today);
  const saved = saveData(data, storage);
  return {
    data,
    seeded: true,
    warning: raw !== null
      ? 'Los datos guardados estaban dañados. Se cargaron los de ejemplo y se guardó una copia aparte.'
      : saved ? undefined : 'No se pudieron guardar los datos de ejemplo en este navegador.',
  };
}

/** Guarda el estado completo. Devuelve false si el navegador lo rechaza (sin lugar, modo privado, etc.). */
export function saveData(data: AppData, storage: Storage = window.localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function resetData(today: ISODate, storage: Storage = window.localStorage): AppData | null {
  const data = buildSeed(today);
  return saveData(data, storage) ? data : null;
}
