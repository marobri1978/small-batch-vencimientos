/**
 * Acciones de negocio puras: reciben los datos completos y devuelven una copia nueva completa.
 * Nunca mutan la entrada, así un guardado fallido deja todo como estaba (recursos y correlativos).
 */
import { diffDays, formatLong, isISODate, type ISODate } from './dates';
import { formatMoney, getDocType, suggestedExpiry } from './catalog';
import { activeDocsOf, alertFor, computeStatus } from './status';
import type {
  AppData,
  Counterparty,
  CounterpartyKind,
  DocTypeId,
  DocumentRecord,
  HistoryEntry,
  HistoryKind,
} from './types';

export type FieldErrors = Record<string, string>;
export type ActionResult = { ok: true; data: AppData; id?: string } | { ok: false; errors: FieldErrors };

const pad = (n: number) => String(n).padStart(4, '0');
const fail = (errors: FieldErrors): ActionResult => ({ ok: false, errors });

function clone(data: AppData): AppData {
  return structuredClone(data);
}

function addHistory(
  data: AppData,
  doc: DocumentRecord,
  kind: HistoryKind,
  date: ISODate,
  text: string,
  extra: Partial<HistoryEntry> = {},
) {
  data.counters.history += 1;
  doc.history.push({ id: `H-${pad(data.counters.history)}`, date, kind, text, ...extra });
}

function findDoc(data: AppData, id: string): DocumentRecord | undefined {
  return data.documents.find((d) => d.id === id);
}

/* ---------- Contrapartes ---------- */

export interface CounterpartyInput {
  name: string;
  kind: CounterpartyKind | '';
  contact: string;
  notes: string;
}

function validateCounterparty(data: AppData, input: CounterpartyInput, selfId?: string): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = 'Escribí el nombre de la contraparte.';
  else if (
    data.counterparties.some(
      (c) => c.id !== selfId && c.status === 'activa' && c.name.trim().toLowerCase() === name.toLowerCase(),
    )
  )
    errors.name = 'Ya hay una contraparte activa con ese nombre.';
  if (!input.kind) errors.kind = 'Elegí qué tipo de contraparte es.';
  return errors;
}

export function createCounterparty(data: AppData, input: CounterpartyInput, today: ISODate): ActionResult {
  const errors = validateCounterparty(data, input);
  if (Object.keys(errors).length) return fail(errors);
  const next = clone(data);
  next.counters.counterparty += 1;
  const cp: Counterparty = {
    id: `CP-${pad(next.counters.counterparty)}`,
    name: input.name.trim(),
    kind: input.kind as CounterpartyKind,
    contact: input.contact.trim(),
    notes: input.notes.trim(),
    status: 'activa',
    createdAt: today,
  };
  next.counterparties.push(cp);
  return { ok: true, data: next, id: cp.id };
}

export function updateCounterparty(data: AppData, id: string, input: CounterpartyInput): ActionResult {
  if (!data.counterparties.some((c) => c.id === id)) return fail({ form: 'La contraparte no existe.' });
  const errors = validateCounterparty(data, input, id);
  if (Object.keys(errors).length) return fail(errors);
  const next = clone(data);
  const cp = next.counterparties.find((c) => c.id === id)!;
  cp.name = input.name.trim();
  cp.kind = input.kind as CounterpartyKind;
  cp.contact = input.contact.trim();
  cp.notes = input.notes.trim();
  return { ok: true, data: next, id };
}

/** Regla: no se puede dar de baja una contraparte con documentos activos (vigentes, por vencer, vencidos o en gestión). */
export function removeCounterparty(data: AppData, id: string, today: ISODate): ActionResult {
  const cp = data.counterparties.find((c) => c.id === id);
  if (!cp) return fail({ form: 'La contraparte no existe.' });
  if (cp.status === 'baja') return fail({ form: 'Ya estaba dada de baja.' });
  const blocking = activeDocsOf(data, id);
  if (blocking.length) {
    return fail({
      form: `Tiene ${blocking.length} ${blocking.length === 1 ? 'documento activo' : 'documentos activos'}. Dalos de baja primero.`,
    });
  }
  const next = clone(data);
  const target = next.counterparties.find((c) => c.id === id)!;
  target.status = 'baja';
  target.removedAt = today;
  return { ok: true, data: next, id };
}

export function reactivateCounterparty(data: AppData, id: string): ActionResult {
  const cp = data.counterparties.find((c) => c.id === id);
  if (!cp) return fail({ form: 'La contraparte no existe.' });
  if (data.counterparties.some((c) => c.id !== id && c.status === 'activa' && c.name.toLowerCase() === cp.name.toLowerCase()))
    return fail({ form: 'Ya hay una contraparte activa con ese nombre.' });
  const next = clone(data);
  const target = next.counterparties.find((c) => c.id === id)!;
  target.status = 'activa';
  delete target.removedAt;
  return { ok: true, data: next, id };
}

/* ---------- Documentos ---------- */

export interface DocumentInput {
  counterpartyId: string;
  typeId: DocTypeId | '';
  title: string;
  startDate: string;
  expiryDate: string;
  amount: string;
  location: string;
  notes: string;
}

function parseAmount(raw: string): number | null | 'invalid' {
  const clean = raw.replace(/[$\s.]/g, '').replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return Math.round(n);
}

export function createDocument(data: AppData, input: DocumentInput, today: ISODate): ActionResult {
  const errors: FieldErrors = {};
  const cp = data.counterparties.find((c) => c.id === input.counterpartyId);
  if (!cp) errors.counterpartyId = 'Elegí a quién pertenece el documento.';
  else if (cp.status === 'baja') errors.counterpartyId = 'Esa contraparte está dada de baja.';
  if (!input.typeId) errors.typeId = 'Elegí el tipo de documento.';
  if (!isISODate(input.startDate)) errors.startDate = 'Poné desde cuándo rige.';
  if (!isISODate(input.expiryDate)) errors.expiryDate = 'Poné la fecha de vencimiento.';
  else if (isISODate(input.startDate) && diffDays(input.startDate, input.expiryDate) < 0)
    errors.expiryDate = 'El vencimiento no puede ser anterior al inicio.';
  const amount = parseAmount(input.amount);
  if (amount === 'invalid') errors.amount = 'El monto tiene que ser un número sin centavos, por ejemplo 28000.';
  if (!input.location.trim()) errors.location = 'Anotá dónde está el original, por ejemplo «Carpeta azul».';
  if (Object.keys(errors).length) return fail(errors);

  const type = getDocType(input.typeId as DocTypeId);
  const next = clone(data);
  next.counters.document += 1;
  const doc: DocumentRecord = {
    id: `DOC-${pad(next.counters.document)}`,
    typeId: type.id,
    counterpartyId: input.counterpartyId,
    title: input.title.trim() || type.shortName,
    startDate: input.startDate,
    expiryDate: input.expiryDate,
    amount: amount as number | null,
    location: input.location.trim(),
    notes: input.notes.trim(),
    status: 'activo',
    seenAt: null,
    seenStatus: null,
    history: [],
  };
  addHistory(next, doc, 'alta', today, `Cargado. Vence el ${formatLong(doc.expiryDate)}.`, {
    toExpiry: doc.expiryDate,
    amount: doc.amount,
  });
  next.documents.push(doc);
  return { ok: true, data: next, id: doc.id };
}

export interface DocumentEditInput {
  title: string;
  location: string;
  notes: string;
}

export function updateDocument(data: AppData, id: string, input: DocumentEditInput, today: ISODate): ActionResult {
  if (!findDoc(data, id)) return fail({ form: 'El documento no existe.' });
  const errors: FieldErrors = {};
  if (input.title.trim().length < 2) errors.title = 'Poné un nombre para reconocerlo.';
  if (!input.location.trim()) errors.location = 'Anotá dónde está el original.';
  if (Object.keys(errors).length) return fail(errors);
  const next = clone(data);
  const doc = findDoc(next, id)!;
  const moved = doc.location !== input.location.trim();
  doc.title = input.title.trim();
  doc.location = input.location.trim();
  doc.notes = input.notes.trim();
  addHistory(next, doc, 'edicion', today, moved ? `Datos editados. Original: ${doc.location}.` : 'Datos editados.');
  return { ok: true, data: next, id };
}

export interface RenewInput {
  startDate: string;
  expiryDate: string;
  amount: string;
  note: string;
}

/** Renovar: fecha nueva + monto. Recalcula, borra el «visto», sale de gestión y suma una línea al historial. */
export function renewDocument(data: AppData, id: string, input: RenewInput, today: ISODate): ActionResult {
  const current = findDoc(data, id);
  if (!current) return fail({ form: 'El documento no existe.' });
  if (current.status === 'baja') return fail({ form: 'Un documento dado de baja no se renueva.' });
  const errors: FieldErrors = {};
  if (!isISODate(input.startDate)) errors.startDate = 'Poné la fecha de renovación.';
  if (!isISODate(input.expiryDate)) errors.expiryDate = 'Poné el nuevo vencimiento.';
  else {
    if (isISODate(input.startDate) && diffDays(input.startDate, input.expiryDate) <= 0)
      errors.expiryDate = 'El nuevo vencimiento tiene que ser posterior a la fecha de renovación.';
    else if (diffDays(today, input.expiryDate) < 0)
      errors.expiryDate = 'El nuevo vencimiento ya pasó. Revisá la fecha.';
  }
  const type = getDocType(current.typeId);
  const amount = parseAmount(input.amount);
  if (amount === 'invalid') errors.amount = 'El monto tiene que ser un número sin centavos.';
  else if (amount === null && type.refAmount !== null) errors.amount = 'Poné el monto que se pagó.';
  if (Object.keys(errors).length) return fail(errors);

  const next = clone(data);
  const doc = findDoc(next, id)!;
  const from = doc.expiryDate;
  doc.startDate = input.startDate;
  doc.expiryDate = input.expiryDate;
  doc.amount = amount as number | null;
  doc.status = 'activo';
  doc.seenAt = null;
  doc.seenStatus = null;
  const note = input.note.trim();
  addHistory(
    next,
    doc,
    'renovacion',
    today,
    `Renovado desde el ${formatLong(input.startDate)}. Vence el ${formatLong(input.expiryDate)}. ${formatMoney(doc.amount)}.${note ? ` ${note}` : ''}`,
    { fromExpiry: from, toExpiry: doc.expiryDate, amount: doc.amount },
  );
  return { ok: true, data: next, id };
}

/** «Ya lo vi»: el aviso deja de contar hasta dentro de 3 días o hasta que pase a Vencido. */
export function markSeen(data: AppData, id: string, today: ISODate): ActionResult {
  const current = findDoc(data, id);
  if (!current) return fail({ form: 'El documento no existe.' });
  const alert = alertFor(current, today);
  if (!alert) return fail({ form: 'Este documento no tiene aviso.' });
  const next = clone(data);
  const doc = findDoc(next, id)!;
  doc.seenAt = today;
  doc.seenStatus = alert.status;
  addHistory(next, doc, 'visto', today, 'Aviso marcado como visto.');
  return { ok: true, data: next, id };
}

/** En gestión: conserva la fecha y sale de los contadores de urgencia. */
export function startManagement(data: AppData, id: string, note: string, today: ISODate): ActionResult {
  const current = findDoc(data, id);
  if (!current) return fail({ form: 'El documento no existe.' });
  if (current.status !== 'activo') return fail({ form: 'Solo un documento activo pasa a En gestión.' });
  const next = clone(data);
  const doc = findDoc(next, id)!;
  doc.status = 'en_gestion';
  doc.seenAt = null;
  doc.seenStatus = null;
  addHistory(next, doc, 'en_gestion', today, `Pasó a En gestión.${note.trim() ? ` ${note.trim()}` : ''}`);
  return { ok: true, data: next, id };
}

export function endManagement(data: AppData, id: string, today: ISODate): ActionResult {
  const current = findDoc(data, id);
  if (!current) return fail({ form: 'El documento no existe.' });
  if (current.status !== 'en_gestion') return fail({ form: 'El documento no estaba en gestión.' });
  const next = clone(data);
  const doc = findDoc(next, id)!;
  doc.status = 'activo';
  addHistory(next, doc, 'fin_gestion', today, `Salió de En gestión sin renovar. Estado: ${computeStatus(doc, today) === 'vencido' ? 'vencido' : 'según su fecha'}.`);
  return { ok: true, data: next, id };
}

export function removeDocument(data: AppData, id: string, reason: string, today: ISODate): ActionResult {
  const current = findDoc(data, id);
  if (!current) return fail({ form: 'El documento no existe.' });
  if (current.status === 'baja') return fail({ form: 'Ya estaba dado de baja.' });
  if (reason.trim().length < 3) return fail({ reason: 'Contá en pocas palabras por qué ya no aplica.' });
  const next = clone(data);
  const doc = findDoc(next, id)!;
  doc.status = 'baja';
  doc.seenAt = null;
  doc.seenStatus = null;
  addHistory(next, doc, 'baja', today, `Dado de baja: ${reason.trim()}`);
  return { ok: true, data: next, id };
}

/** Valores iniciales de la renovación: desde hoy, con la duración habitual del tipo. */
export function renewDefaults(doc: DocumentRecord, today: ISODate): RenewInput {
  const type = getDocType(doc.typeId);
  return {
    startDate: today,
    expiryDate: suggestedExpiry(doc.typeId, today) ?? '',
    amount: doc.amount != null ? String(doc.amount) : type.refAmount != null ? String(type.refAmount) : '',
    note: '',
  };
}
