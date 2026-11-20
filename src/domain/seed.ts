/**
 * Datos de ejemplo sintéticos. Las fechas se calculan relativas al día en que se cargan,
 * así la demo siempre muestra la misma foto: un vencido, varios por vencer, uno en gestión, etc.
 * Ningún dato pertenece a personas reales.
 */
import { addDays, addMonths, formatLong, nextWeekday, type ISODate } from './dates';
import { suggestedExpiry } from './catalog';
import type { AppData, Counterparty, DocTypeId, DocumentRecord, HistoryEntry } from './types';

const SATURDAY = 6;

export function buildSeed(today: ISODate): AppData {
  const counterparties: Counterparty[] = [
    cp(1, 'El Local', 'local', 'Lo atiende quien abre a las 10. Papeles en el mueble de la caja.', 'Vinoteca con catas los miércoles y sábados.'),
    cp(2, 'Viñas del Arroyo Hondo', 'productor', 'Bodega familiar. Llamar al número de la bodega por la mañana.', 'Malbec y Cabernet Franc de altura. Góndola Cuyo.'),
    cp(3, 'Viñas de la Meseta', 'productor', 'Contacto por correo de la bodega.', 'Pinot Noir y blancos patagónicos. Góndola Patagonia.'),
    cp(4, 'Finca Cuatro Vientos', 'productor', 'Visitan el local una vez por mes.', 'Torrontés y criollas. Góndola Norte.'),
    cp(5, 'Distribuidora Atlántica', 'distribuidor', 'Vendedor de zona, pasa los martes.', 'Manda la lista de precios cada tres semanas.'),
    cp(6, 'Vinos del Litoral', 'distribuidor', 'Pedidos por el portal de la distribuidora.', 'Espumantes y vinos de la costa.'),
    cp(7, 'Matafuegos Costa', 'servicio', 'Turnos por teléfono de lunes a viernes.', 'Hace la recarga de los dos equipos del local.'),
    cp(8, 'Control de Plagas Sur', 'servicio', 'Avisar con una semana de anticipación.', 'Fumigación del salón y del depósito.'),
    cp(9, 'Seguros del Puerto', 'servicio', 'Productora asesora, atiende por correo.', 'Tiene la póliza del seguro integral.'),
  ];

  let docN = 0;
  let histN = 0;
  const hist = (date: ISODate, kind: HistoryEntry['kind'], text: string, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id: `H-${String(++histN).padStart(4, '0')}`,
    date,
    kind,
    text,
    ...extra,
  });

  function doc(
    typeId: DocTypeId,
    counterpartyId: string,
    title: string,
    dates: { start: ISODate; expiry?: ISODate },
    amount: number | null,
    location: string,
    notes = '',
  ): DocumentRecord {
    const expiry = dates.expiry ?? suggestedExpiry(typeId, dates.start)!;
    return {
      id: `DOC-${String(++docN).padStart(4, '0')}`,
      typeId,
      counterpartyId,
      title,
      startDate: dates.start,
      expiryDate: expiry,
      amount,
      location,
      notes,
      status: 'activo',
      seenAt: null,
      seenStatus: null,
      history: [hist(dates.start, 'alta', `Cargado. Vence el ${formatLong(expiry)}.`, { toExpiry: expiry, amount })],
    };
  }

  /** Inicio para que un documento de duración en meses venza `offset` días después de hoy. */
  const startFor = (months: number, offset: number) => addMonths(addDays(today, offset), -months);

  const nextSat = nextWeekday(today, SATURDAY);
  const satAfter = nextWeekday(today, SATURDAY, 1);
  const lastSat = addDays(nextSat, -7);

  const documents: DocumentRecord[] = [
    doc('habilitacion', 'CP-0001', 'Habilitación comercial del local', { start: startFor(24, 210) }, 85_000, 'Original en la carpeta azul', 'Expediente municipal a nombre del local.'),
    doc('permiso-bebidas', 'CP-0001', 'Permiso de venta de bebidas alcohólicas', { start: startFor(12, 38) }, 60_000, 'Original en la carpeta azul', 'Se renueva en la ventanilla de comercio.'),
    doc('seguro', 'CP-0001', 'Seguro integral del comercio', { start: startFor(12, 12) }, 320_000, 'Póliza en el mail de administración', 'Lo gestiona Seguros del Puerto.'),
    doc('matafuegos', 'CP-0001', 'Matafuegos del salón (equipo 1)', { start: startFor(12, -2) }, 28_000, 'Tarjeta colgada en el equipo y copia en la carpeta azul', 'Recarga con Matafuegos Costa.'),
    doc('matafuegos', 'CP-0001', 'Matafuegos del depósito (equipo 2)', { start: startFor(12, 150) }, 28_000, 'Tarjeta colgada en el equipo y copia en la carpeta azul', 'Recarga con Matafuegos Costa.'),
    doc('plagas', 'CP-0001', 'Control de plagas del salón y depósito', { start: startFor(6, 60) }, 40_000, 'Certificado pegado detrás del mostrador', 'Servicio de Control de Plagas Sur.'),
    doc('consignacion', 'CP-0002', 'Acuerdo de consignación 2.º semestre', { start: startFor(6, 15) }, null, 'Foto en el celular del local y original en la carpeta verde', 'Liquidación mensual de lo vendido.'),
    doc('consignacion', 'CP-0003', 'Acuerdo de consignación de temporada', { start: startFor(6, 95) }, null, 'Original en la carpeta verde'),
    doc('consignacion', 'CP-0004', 'Acuerdo de consignación anual en dos tramos', { start: startFor(6, 130) }, null, 'Original en la carpeta verde'),
    doc('lista-precios', 'CP-0005', 'Lista de precios vigente', { start: addDays(today, -17) }, null, 'PDF en el mail de compras', 'Usar esta lista para cajas cerradas.'),
    doc('lista-precios', 'CP-0006', 'Lista de precios de espumantes', { start: addDays(today, -24) }, null, 'Impresa en la carpeta de listas', 'Pedir la nueva antes de reponer.'),
    doc('permiso-cata', 'CP-0001', `Permiso de cata del sábado ${formatLong(nextSat)}`, { start: addDays(nextSat, -20), expiry: nextSat }, 15_000, 'Comprobante en la carpeta azul', 'Cata con Viñas del Arroyo Hondo.'),
    doc('permiso-cata', 'CP-0001', `Permiso de cata del sábado ${formatLong(satAfter)}`, { start: addDays(satAfter, -20), expiry: satAfter }, 15_000, 'Comprobante en la carpeta azul', 'Cata con Finca Cuatro Vientos.'),
    doc('lista-precios', 'CP-0005', 'Lista de precios anterior', { start: addDays(today, -38) }, null, 'Impresa en la carpeta de listas'),
    doc('permiso-cata', 'CP-0001', `Permiso de cata del sábado ${formatLong(lastSat)}`, { start: addDays(lastSat, -20), expiry: lastSat }, 15_000, 'Comprobante en la carpeta azul', 'Cata con Viñas de la Meseta.'),
  ];

  // Permiso de bebidas: aviso ya visto ayer (vuelve a contar en 2 días).
  const bebidas = documents[1];
  bebidas.seenAt = addDays(today, -1);
  bebidas.seenStatus = 'por_vencer';
  bebidas.history.push(hist(addDays(today, -1), 'visto', 'Aviso marcado como visto.'));

  // Seguro: el trámite ya empezó.
  const seguro = documents[2];
  seguro.status = 'en_gestion';
  seguro.history.push(hist(addDays(today, -2), 'en_gestion', 'Pasó a En gestión. Seguros del Puerto manda la póliza nueva.'));

  // Lista anterior de Distribuidora Atlántica: reemplazada.
  const listaVieja = documents[13];
  listaVieja.status = 'baja';
  listaVieja.history.push(hist(addDays(today, -17), 'baja', 'Dado de baja: llegó la lista nueva.'));

  // Cata del sábado pasado: el evento ya se hizo.
  const cataPasada = documents[14];
  cataPasada.status = 'baja';
  cataPasada.history.push(hist(addDays(lastSat, 1), 'baja', 'Dado de baja: el evento ya se hizo.'));

  return {
    version: 1,
    seededOn: today,
    counters: { counterparty: counterparties.length, document: docN, history: histN },
    counterparties,
    documents,
  };

  function cp(n: number, name: string, kind: Counterparty['kind'], contact: string, notes: string): Counterparty {
    return {
      id: `CP-${String(n).padStart(4, '0')}`,
      name,
      kind,
      contact,
      notes,
      status: 'activa',
      createdAt: addDays(today, -400),
    };
  }
}
