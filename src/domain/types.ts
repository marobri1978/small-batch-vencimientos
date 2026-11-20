import type { ISODate } from './dates';

/** Ids estables, legibles y correlativos: "CP-0001", "DOC-0001", "H-0001". */
export type CounterpartyId = string;
export type DocumentId = string;
export type DocTypeId =
  | 'habilitacion'
  | 'permiso-bebidas'
  | 'seguro'
  | 'matafuegos'
  | 'plagas'
  | 'consignacion'
  | 'lista-precios'
  | 'permiso-cata';

export type CounterpartyKind = 'local' | 'productor' | 'distribuidor' | 'servicio';

/** Estado guardado de una contraparte. */
export type CounterpartyRecordStatus = 'activa' | 'baja';

export interface Counterparty {
  id: CounterpartyId;
  name: string;
  kind: CounterpartyKind;
  /** Cómo ubicarla. Datos de ejemplo: nunca información personal real. */
  contact: string;
  notes: string;
  status: CounterpartyRecordStatus;
  createdAt: ISODate;
  removedAt?: ISODate;
}

export type DurationUnit = 'years' | 'months' | 'days' | 'fecha';

export interface DocType {
  id: DocTypeId;
  name: string;
  shortName: string;
  duration: { unit: DurationUnit; value: number };
  /** Días antes del vencimiento en los que pasa a "Por vencer". */
  warnDays: number;
  /** Monto de referencia en pesos; null = sin monto. */
  refAmount: number | null;
  perUnit?: string;
  kinds: CounterpartyKind[];
}

/**
 * Estado guardado de un documento (lo decide una persona).
 * Vigente / Por vencer / Vencido NO se guardan: se calculan con la fecha de referencia.
 */
export type DocRecordStatus = 'activo' | 'en_gestion' | 'baja';

/** Estado que ve la gente, siempre calculado. */
export type DocStatus = 'vigente' | 'por_vencer' | 'vencido' | 'en_gestion' | 'baja';

export type HistoryKind = 'alta' | 'renovacion' | 'en_gestion' | 'fin_gestion' | 'visto' | 'baja' | 'edicion';

export interface HistoryEntry {
  id: string;
  date: ISODate;
  kind: HistoryKind;
  text: string;
  fromExpiry?: ISODate;
  toExpiry?: ISODate;
  amount?: number | null;
}

export interface DocumentRecord {
  id: DocumentId;
  typeId: DocTypeId;
  counterpartyId: CounterpartyId;
  title: string;
  /** Desde cuándo rige (alta o última renovación). */
  startDate: ISODate;
  expiryDate: ISODate;
  amount: number | null;
  /** Dónde está el papel original. No se suben archivos. */
  location: string;
  notes: string;
  status: DocRecordStatus;
  /** Último «Ya lo vi» sobre el aviso vigente. */
  seenAt: ISODate | null;
  /** Estado que tenía el aviso cuando se marcó como visto. */
  seenStatus: 'por_vencer' | 'vencido' | null;
  history: HistoryEntry[];
}

export interface AppData {
  version: 1;
  seededOn: ISODate;
  counters: { counterparty: number; document: number; history: number };
  counterparties: Counterparty[];
  documents: DocumentRecord[];
}
