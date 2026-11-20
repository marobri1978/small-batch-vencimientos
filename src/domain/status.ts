/**
 * Vigencia con fecha de referencia.
 * Todo cálculo recibe `today` explícito: lista, avisos y agenda usan la misma fecha.
 * Mirar otro mes en la agenda nunca cambia `today`.
 */
import { addDays, daysInMonth, diffDays, monthKey, type ISODate, type MonthKey } from './dates';
import { getDocType } from './catalog';
import type { AppData, DocStatus, DocumentRecord } from './types';

/** Días que tarda un aviso visto en volver a contar. */
export const SEEN_SNOOZE_DAYS = 3;

export function daysLeft(doc: DocumentRecord, today: ISODate): number {
  return diffDays(today, doc.expiryDate);
}

/** Estado por fechas, ignorando la marca manual. */
export function dateStatus(doc: DocumentRecord, today: ISODate): 'vigente' | 'por_vencer' | 'vencido' {
  const left = daysLeft(doc, today);
  if (left < 0) return 'vencido';
  if (left <= getDocType(doc.typeId).warnDays) return 'por_vencer';
  return 'vigente';
}

export function computeStatus(doc: DocumentRecord, today: ISODate): DocStatus {
  if (doc.status === 'baja') return 'baja';
  if (doc.status === 'en_gestion') return 'en_gestion';
  return dateStatus(doc, today);
}

export const STATUS_LABEL: Record<DocStatus, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  en_gestion: 'En gestión',
  baja: 'Dado de baja',
};

/** «Vence en 4 días», «Vence hoy», «Venció hace 2 días». */
export function relativeLabel(doc: DocumentRecord, today: ISODate): string {
  const left = daysLeft(doc, today);
  if (left === 0) return 'Vence hoy';
  if (left === 1) return 'Vence mañana';
  if (left > 1) return `Vence en ${left} días`;
  if (left === -1) return 'Venció ayer';
  return `Venció hace ${-left} días`;
}

export function isPriceListBlocked(doc: DocumentRecord, today: ISODate): boolean {
  return doc.typeId === 'lista-precios' && computeStatus(doc, today) === 'vencido';
}

export interface Alert {
  doc: DocumentRecord;
  status: 'por_vencer' | 'vencido';
  /** true si suma en la marca del encabezado. */
  unseen: boolean;
  /** Cuándo vuelve a contar un aviso visto. */
  returnsOn: ISODate | null;
}

export function alertFor(doc: DocumentRecord, today: ISODate): Alert | null {
  const status = computeStatus(doc, today);
  if (status !== 'por_vencer' && status !== 'vencido') return null;
  if (!doc.seenAt) return { doc, status, unseen: true, returnsOn: null };
  const escalated = doc.seenStatus === 'por_vencer' && status === 'vencido';
  const returnsOn = addDays(doc.seenAt, SEEN_SNOOZE_DAYS);
  const expired = diffDays(returnsOn, today) >= 0;
  if (escalated || expired) return { doc, status, unseen: true, returnsOn: null };
  return { doc, status, unseen: false, returnsOn };
}

export function getAlerts(data: AppData, today: ISODate): Alert[] {
  return data.documents
    .map((d) => alertFor(d, today))
    .filter((a): a is Alert => a !== null)
    .sort((a, b) => {
      if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
      if (a.status !== b.status) return a.status === 'vencido' ? -1 : 1;
      return a.doc.expiryDate.localeCompare(b.doc.expiryDate);
    });
}

export function badgeCount(data: AppData, today: ISODate): number {
  return getAlerts(data, today).filter((a) => a.unseen).length;
}

/** Contadores de urgencia: En gestión y Dado de baja no suman. */
export function urgencyCounters(data: AppData, today: ISODate) {
  const c = { vencido: 0, por_vencer: 0, vigente: 0, en_gestion: 0, baja: 0 };
  for (const d of data.documents) c[computeStatus(d, today)] += 1;
  return c;
}

export interface AgendaMonth {
  month: MonthKey;
  days: { day: number; date: ISODate; docs: DocumentRecord[] }[];
  docs: DocumentRecord[];
  total: number;
}

/** Vencimientos del mes visible. Los dados de baja no figuran. */
export function agendaForMonth(data: AppData, month: MonthKey): AgendaMonth {
  const docs = data.documents
    .filter((d) => d.status !== 'baja' && monthKey(d.expiryDate) === month)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.title.localeCompare(b.title));
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { day: i + 1, date, docs: docs.filter((d) => d.expiryDate === date) };
  });
  const total = docs.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  return { month, days, docs, total };
}

/** Documentos que impiden dar de baja una contraparte. */
export function activeDocsOf(data: AppData, counterpartyId: string): DocumentRecord[] {
  return data.documents.filter((d) => d.counterpartyId === counterpartyId && d.status !== 'baja');
}

const STATUS_WEIGHT: Record<DocStatus, number> = { vencido: 0, por_vencer: 1, en_gestion: 2, vigente: 3, baja: 4 };

export function worstStatus(docs: DocumentRecord[], today: ISODate): DocStatus | null {
  let worst: DocStatus | null = null;
  for (const d of docs) {
    const s = computeStatus(d, today);
    if (worst === null || STATUS_WEIGHT[s] < STATUS_WEIGHT[worst]) worst = s;
  }
  return worst;
}

export function sortByUrgency(docs: DocumentRecord[], today: ISODate): DocumentRecord[] {
  return [...docs].sort(
    (a, b) =>
      STATUS_WEIGHT[computeStatus(a, today)] - STATUS_WEIGHT[computeStatus(b, today)] ||
      a.expiryDate.localeCompare(b.expiryDate),
  );
}
