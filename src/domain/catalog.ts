import { addDays, addMonths, type ISODate } from './dates';
import type { CounterpartyKind, DocType, DocTypeId } from './types';

export const DOC_TYPES: DocType[] = [
  {
    id: 'habilitacion',
    name: 'Habilitación comercial del local',
    shortName: 'Habilitación comercial',
    duration: { unit: 'years', value: 2 },
    warnDays: 60,
    refAmount: 85_000,
    kinds: ['local'],
  },
  {
    id: 'permiso-bebidas',
    name: 'Permiso municipal de venta de bebidas alcohólicas',
    shortName: 'Permiso de bebidas alcohólicas',
    duration: { unit: 'years', value: 1 },
    warnDays: 45,
    refAmount: 60_000,
    kinds: ['local'],
  },
  {
    id: 'seguro',
    name: 'Seguro integral del comercio',
    shortName: 'Seguro integral',
    duration: { unit: 'years', value: 1 },
    warnDays: 30,
    refAmount: 320_000,
    kinds: ['local', 'servicio'],
  },
  {
    id: 'matafuegos',
    name: 'Recarga de matafuegos',
    shortName: 'Recarga de matafuegos',
    duration: { unit: 'years', value: 1 },
    warnDays: 20,
    refAmount: 28_000,
    perUnit: 'por equipo',
    kinds: ['local', 'servicio'],
  },
  {
    id: 'plagas',
    name: 'Control de plagas',
    shortName: 'Control de plagas',
    duration: { unit: 'months', value: 6 },
    warnDays: 15,
    refAmount: 40_000,
    kinds: ['local', 'servicio'],
  },
  {
    id: 'consignacion',
    name: 'Acuerdo de consignación con productor',
    shortName: 'Acuerdo de consignación',
    duration: { unit: 'months', value: 6 },
    warnDays: 20,
    refAmount: null,
    kinds: ['productor'],
  },
  {
    id: 'lista-precios',
    name: 'Lista de precios de distribuidor',
    shortName: 'Lista de precios',
    duration: { unit: 'days', value: 21 },
    warnDays: 5,
    refAmount: null,
    kinds: ['distribuidor'],
  },
  {
    id: 'permiso-cata',
    name: 'Permiso para evento de cata con productores',
    shortName: 'Permiso de cata',
    duration: { unit: 'fecha', value: 0 },
    warnDays: 7,
    refAmount: 15_000,
    kinds: ['local', 'productor'],
  },
];

export function getDocType(id: DocTypeId): DocType {
  const t = DOC_TYPES.find((d) => d.id === id);
  if (!t) throw new Error(`Tipo de documento desconocido: ${id}`);
  return t;
}

/** Vencimiento sugerido a partir de la fecha de inicio. Null si el tipo vence "por fecha". */
export function suggestedExpiry(typeId: DocTypeId, start: ISODate): ISODate | null {
  const { unit, value } = getDocType(typeId).duration;
  switch (unit) {
    case 'years':
      return addMonths(start, value * 12);
    case 'months':
      return addMonths(start, value);
    case 'days':
      return addDays(start, value);
    case 'fecha':
      return null;
  }
}

export function durationLabel(t: DocType): string {
  const { unit, value } = t.duration;
  if (unit === 'fecha') return 'por fecha';
  if (unit === 'years') return value === 1 ? '1 año' : `${value} años`;
  if (unit === 'months') return value === 1 ? '1 mes' : `${value} meses`;
  return `${value} días`;
}

export const KIND_LABEL: Record<CounterpartyKind, string> = {
  local: 'El local',
  productor: 'Productor',
  distribuidor: 'Distribuidor',
  servicio: 'Servicio',
};

export const KIND_PLURAL: Record<CounterpartyKind, string> = {
  local: 'El local',
  productor: 'Productores',
  distribuidor: 'Distribuidores',
  servicio: 'Servicios',
};

const money = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return 'Sin monto';
  return `$ ${money.format(amount)}`;
}
