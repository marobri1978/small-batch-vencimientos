import { describe, expect, it } from 'vitest';
import { addDays } from '../domain/dates';
import { buildSeed } from '../domain/seed';
import {
  agendaForMonth,
  alertFor,
  badgeCount,
  computeStatus,
  daysLeft,
  getAlerts,
  isPriceListBlocked,
  urgencyCounters,
} from '../domain/status';
import {
  createDocument,
  markSeen,
  removeCounterparty,
  removeDocument,
  renewDefaults,
  renewDocument,
  startManagement,
  type ActionResult,
} from '../domain/actions';
import { loadData, saveData, STORAGE_KEY } from '../state/storage';
import type { AppData } from '../domain/types';
import { ATLANTICA_LIST, REF } from './referencia';

/** Copia aislada de la semilla: no toca el catálogo inicial. */
const fresh = () => structuredClone(buildSeed(REF));
const ok = (r: ActionResult): AppData => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.data;
};
const doc = (data: AppData, id: string) => data.documents.find((d) => d.id === id)!;

describe('catálogo inicial', () => {
  it('tiene 9 contrapartes y 15 documentos', () => {
    const s = fresh();
    expect(s.counterparties).toHaveLength(9);
    expect(s.documents).toHaveLength(15);
    expect(s.counters.counterparty).toBe(9);
    expect(s.counters.document).toBe(15);
  });
});

describe('caso de aceptación: lista de precios de 21 días cargada hace 17', () => {
  it('aparece Por vencer con 4 días y al renovar con fecha de hoy vuelve a Vigente con 21', () => {
    const data = fresh();
    const lista = doc(data, ATLANTICA_LIST);
    expect(lista.startDate).toBe(addDays(REF, -17));
    expect(daysLeft(lista, REF)).toBe(4);
    expect(computeStatus(lista, REF)).toBe('por_vencer');

    const renewed = ok(renewDocument(data, ATLANTICA_LIST, renewDefaults(lista, REF), REF));
    const after = doc(renewed, ATLANTICA_LIST);
    expect(after.expiryDate).toBe(addDays(REF, 21));
    expect(daysLeft(after, REF)).toBe(21);
    expect(computeStatus(after, REF)).toBe('vigente');
    expect(after.history.at(-1)?.kind).toBe('renovacion');
    expect(after.history.length).toBe(lista.history.length + 1);
    // la entrada no se tocó
    expect(computeStatus(doc(data, ATLANTICA_LIST), REF)).toBe('por_vencer');
  });

  it('cambiar el mes visible de la agenda no cambia el estado ni los datos', () => {
    const data = fresh();
    const dec = agendaForMonth(data, '2026-12');
    const jan = agendaForMonth(data, '2027-01');
    expect(dec.docs.map((d) => d.id)).toContain(ATLANTICA_LIST);
    expect(jan.docs.map((d) => d.id)).not.toContain(ATLANTICA_LIST);
    expect(computeStatus(doc(data, ATLANTICA_LIST), REF)).toBe('por_vencer');
    expect(data).toEqual(fresh());
  });
});

describe('límites de estado', () => {
  const lista = () => doc(fresh(), ATLANTICA_LIST); // avisa 5 días antes
  const at = (left: number) => ({ ...lista(), expiryDate: addDays(REF, left) });
  it.each([
    [6, 'vigente'],
    [5, 'por_vencer'],
    [1, 'por_vencer'],
    [0, 'por_vencer'],
    [-1, 'vencido'],
  ])('con %i días restantes → %s', (left, expected) => {
    expect(computeStatus(at(left as number), REF)).toBe(expected);
  });

  it('un documento con la fecha pasada se ve Vencido solo, sin cambiarlo a mano', () => {
    const d = at(4);
    expect(computeStatus(d, REF)).toBe('por_vencer');
    expect(computeStatus(d, addDays(REF, 5))).toBe('vencido');
    expect(d.status).toBe('activo');
  });

  it('una lista vencida muestra «No vender con esta lista»', () => {
    const litoral = fresh().documents.find((d) => d.counterpartyId === 'CP-0006')!;
    expect(computeStatus(litoral, REF)).toBe('vencido');
    expect(isPriceListBlocked(litoral, REF)).toBe(true);
  });
});

describe('avisos y marca del encabezado', () => {
  it('un documento nuevo dentro de sus días de aviso suma 1', () => {
    const data = fresh();
    const before = badgeCount(data, REF);
    const next = ok(
      createDocument(
        data,
        { counterpartyId: 'CP-0001', typeId: 'plagas', title: '', startDate: addDays(REF, -175), expiryDate: addDays(REF, 8), amount: '40000', location: 'Carpeta azul', notes: '' },
        REF,
      ),
    );
    expect(computeStatus(next.documents.at(-1)!, REF)).toBe('por_vencer');
    expect(badgeCount(next, REF)).toBe(before + 1);
  });

  it('«Ya lo vi» baja la marca; vuelve a los 3 días si sigue igual', () => {
    const data = fresh();
    const before = badgeCount(data, REF);
    const seen = ok(markSeen(data, ATLANTICA_LIST, REF));
    expect(badgeCount(seen, REF)).toBe(before - 1);
    expect(alertFor(doc(seen, ATLANTICA_LIST), addDays(REF, 2))?.unseen).toBe(false);
    expect(alertFor(doc(seen, ATLANTICA_LIST), addDays(REF, 3))?.unseen).toBe(true);
  });

  it('un aviso visto vuelve enseguida si el documento pasa a Vencido', () => {
    const seenOn = addDays(REF, 3); // falta 1 día
    const seen = ok(markSeen(fresh(), ATLANTICA_LIST, seenOn));
    const d = doc(seen, ATLANTICA_LIST);
    expect(alertFor(d, addDays(REF, 4))?.unseen).toBe(false); // vence hoy, sigue visto
    const vencido = alertFor(d, addDays(REF, 5)); // 2 días después del visto
    expect(vencido?.status).toBe('vencido');
    expect(vencido?.unseen).toBe(true);
  });

  it('renovar, pasar a En gestión o dar de baja bajan la marca', () => {
    const data = fresh();
    const before = badgeCount(data, REF);
    const lista = doc(data, ATLANTICA_LIST);
    expect(badgeCount(ok(renewDocument(data, ATLANTICA_LIST, renewDefaults(lista, REF), REF)), REF)).toBe(before - 1);
    expect(badgeCount(ok(startManagement(data, ATLANTICA_LIST, '', REF)), REF)).toBe(before - 1);
    expect(badgeCount(ok(removeDocument(data, ATLANTICA_LIST, 'Ya no trabajamos', REF)), REF)).toBe(before - 1);
  });
});

describe('En gestión', () => {
  it('conserva la fecha y sale de los contadores de urgencia', () => {
    const data = fresh();
    const c0 = urgencyCounters(data, REF);
    const next = ok(startManagement(data, ATLANTICA_LIST, 'Pedimos la lista nueva', REF));
    const d = doc(next, ATLANTICA_LIST);
    expect(d.expiryDate).toBe(doc(data, ATLANTICA_LIST).expiryDate);
    expect(computeStatus(d, REF)).toBe('en_gestion');
    const c1 = urgencyCounters(next, REF);
    expect(c1.por_vencer).toBe(c0.por_vencer - 1);
    expect(c1.en_gestion).toBe(c0.en_gestion + 1);
    expect(getAlerts(next, REF).some((a) => a.doc.id === ATLANTICA_LIST)).toBe(false);
  });
});

describe('agenda del mes', () => {
  it('cada vencimiento cae en su día y el total coincide con la suma de los montos', () => {
    const data = fresh();
    for (const m of ['2026-11', '2026-12', '2027-01', '2027-06']) {
      const a = agendaForMonth(data, m);
      expect(a.total).toBe(a.docs.reduce((s, d) => s + (d.amount ?? 0), 0));
      for (const day of a.days) for (const d of day.docs) expect(d.expiryDate).toBe(day.date);
      expect(a.docs.every((d) => d.status !== 'baja')).toBe(true);
    }
  });
});

describe('contrapartes', () => {
  it('no se da de baja una contraparte con documentos activos', () => {
    expect(removeCounterparty(fresh(), 'CP-0005', REF).ok).toBe(false);
  });
  it('sí se da de baja cuando sus documentos están dados de baja', () => {
    let data = fresh();
    for (const d of data.documents.filter((x) => x.counterpartyId === 'CP-0005' && x.status !== 'baja'))
      data = ok(removeDocument(data, d.id, 'Cambiamos de distribuidor', REF));
    expect(removeCounterparty(data, 'CP-0005', REF).ok).toBe(true);
  });
});

describe('guardado', () => {
  it('si localStorage falla no cambia nada: ni datos ni correlativos', () => {
    const data = fresh();
    const r = createDocument(
      data,
      { counterpartyId: 'CP-0001', typeId: 'matafuegos', title: 'Equipo 3', startDate: REF, expiryDate: addDays(REF, 365), amount: '28000', location: 'Barra', notes: '' },
      REF,
    );
    const broken = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    expect(r.ok && saveData(r.data, broken)).toBe(false);
    expect(data.counters.document).toBe(15);
    expect(data.documents).toHaveLength(15);
  });

  it('la semilla se carga solo si no existe la clave propia', () => {
    window.localStorage.clear();
    const first = loadData(REF);
    expect(first.seeded).toBe(true);
    saveData(ok(removeDocument(first.data, ATLANTICA_LIST, 'Prueba', REF)));
    const second = loadData(REF);
    expect(second.seeded).toBe(false);
    expect(computeStatus(doc(second.data, ATLANTICA_LIST), REF)).toBe('baja');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
