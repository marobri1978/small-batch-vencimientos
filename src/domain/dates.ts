/**
 * Fechas de calendario como texto "AAAA-MM-DD".
 * Toda la aritmética se hace en UTC para que no influyan los cambios de horario.
 */
export type ISODate = string;

export const BUSINESS_TIMEZONE = 'America/Argentina/Buenos_Aires';

const DAY_MS = 86_400_000;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = toUTC(value);
  return !Number.isNaN(d.getTime()) && fromUTC(d) === value;
}

function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

/** Fecha actual del negocio (hora de Argentina), independiente de la zona del dispositivo. */
export function businessToday(now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(new Date(toUTC(date).getTime() + days * DAY_MS));
}

/** Suma meses respetando el fin de mes (31/01 + 1 mes = 28/02). */
export function addMonths(date: ISODate, months: number): ISODate {
  const d = toUTC(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUTC(target);
}

/** Días de calendario desde `from` hasta `to` (positivo si `to` es posterior). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / DAY_MS);
}

export function weekday(date: ISODate): number {
  return toUTC(date).getUTCDay(); // 0 = domingo
}

/** Próximo día de la semana estrictamente posterior a `date`. */
export function nextWeekday(date: ISODate, targetDay: number, skipWeeks = 0): ISODate {
  let delta = (targetDay - weekday(date) + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(date, delta + skipWeeks * 7);
}

/** "AAAA-MM" */
export type MonthKey = string;

export function monthKey(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  return monthKey(addMonths(`${key}-01`, delta));
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function formatLong(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

export function formatShort(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS_SHORT[weekday(date)]} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

export function formatMonth(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}
