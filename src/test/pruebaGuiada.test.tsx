/**
 * Prueba guiada automatizada (criterio 8):
 * «Con 4 días restantes aparece Por vencer en todas las vistas. Navegar al mes siguiente
 *  no cambia ese estado y renovar con fecha actual sí lo actualiza.»
 * Usa la fecha de referencia fija de ./referencia y un localStorage vacío (copia aislada de la semilla).
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { STORAGE_KEY } from '../state/storage';
import { ATLANTICA_LIST, REF } from './referencia';

const card = () => screen.getByTestId(`doc-${ATLANTICA_LIST}`);
const badge = () => screen.queryByTestId('header-badge')?.textContent ?? '0';

describe('prueba guiada: vigencia con fecha de referencia', () => {
  it('Por vencer en todas las vistas, estable al cambiar de mes y Vigente al renovar', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App fixedToday={REF} />);

    // 1. Avisos
    expect(screen.getByText('Hoy es 10 de diciembre de 2026')).toBeInTheDocument();
    expect(within(card()).getByText('Por vencer')).toBeInTheDocument();
    expect(within(card()).getByText('Vence en 4 días')).toBeInTheDocument();
    const initialBadge = Number(badge());
    expect(initialBadge).toBeGreaterThan(0);

    // 2. Documentos (lista)
    await user.click(screen.getByRole('link', { name: /Documentos/ }));
    expect(within(card()).getByText('Por vencer')).toBeInTheDocument();

    // 3. Detalle
    await user.click(within(card()).getByRole('link'));
    const detail = screen.getByTestId('doc-detail');
    expect(within(detail).getByText('Por vencer')).toBeInTheDocument();
    expect(within(detail).getByText('Vence en 4 días')).toBeInTheDocument();

    // 4. Agenda: el vencimiento cae el 14/12
    await user.click(screen.getByRole('link', { name: /Agenda/ }));
    expect(screen.getByTestId('agenda-month')).toHaveTextContent('Diciembre 2026');
    expect(screen.getByTestId('day-2026-12-14')).not.toBeDisabled();
    expect(within(screen.getByTestId(`agenda-${ATLANTICA_LIST}`)).getByText('Por vencer')).toBeInTheDocument();

    // 5. Mes siguiente: no cambia hoy, ni la marca, ni el estado
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByTestId('agenda-month')).toHaveTextContent('Enero 2027');
    expect(screen.getByText('Hoy es 10 de diciembre de 2026')).toBeInTheDocument();
    expect(Number(badge())).toBe(initialBadge);
    await user.click(screen.getByRole('button', { name: 'Volver al mes actual' }));
    expect(within(screen.getByTestId(`agenda-${ATLANTICA_LIST}`)).getByText('Por vencer')).toBeInTheDocument();

    // 6. Renovar con fecha actual desde el detalle
    await user.click(screen.getByTestId(`agenda-${ATLANTICA_LIST}`));
    await user.click(screen.getByRole('button', { name: /Renovar/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Fecha de renovación')).toHaveValue(REF);
    expect(within(dialog).getByLabelText('Nuevo vencimiento')).toHaveValue('2026-12-31');
    expect(within(dialog).getByText(/Demo:/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Guardar renovación' }));

    const after = screen.getByTestId('doc-detail');
    expect(within(after).getByText('Vigente')).toBeInTheDocument();
    expect(within(after).getByText('Vence en 21 días')).toBeInTheDocument();
    expect(within(screen.getByTestId('history')).getByText(/Renovado desde el 10 de diciembre de 2026/)).toBeInTheDocument();
    expect(Number(badge())).toBe(initialBadge - 1);

    // 7. Persistencia: al "recargar" sigue Vigente
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"expiryDate":"2026-12-31"');
    unmount();
    window.location.hash = '#/documentos';
    render(<App fixedToday={REF} />);
    expect(within(card()).getByText('Vigente')).toBeInTheDocument();
  });

  it('«Ya lo vi» baja la marca y en cero dice «Todo en orden por hoy»', async () => {
    const user = userEvent.setup();
    render(<App fixedToday={REF} />);
    let n = Number(badge());
    while (n > 0) {
      await user.click(screen.getAllByRole('button', { name: /Ya lo vi/ })[0]);
      expect(Number(badge())).toBe(n - 1);
      n -= 1;
    }
    expect(screen.queryByTestId('header-badge')).not.toBeInTheDocument();
    expect(screen.getByText('Todo en orden por hoy')).toBeInTheDocument();
  });

  it('si el guardado falla, no muestra éxito y conserva lo escrito', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/contrapartes?nueva=1';
    render(<App fixedToday={REF} />);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Bodega Las Toscas');
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'productor');
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      await user.click(within(dialog).getByRole('button', { name: 'Guardar contraparte' }));
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Nombre')).toHaveValue('Bodega Las Toscas');
    expect(screen.getAllByText(/No se pudo guardar/).length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toContain('Bodega Las Toscas');
  });

  it('no deja dar de baja una contraparte con documentos activos', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/contrapartes/CP-0005';
    render(<App fixedToday={REF} />);
    await user.click(screen.getByRole('button', { name: /Dar de baja/ }));
    expect(screen.getByText(/No se puede dar de baja: tiene 1 documento activo/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
