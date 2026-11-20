import { useMemo, useState, type FormEvent } from 'react';
import {
  createCounterparty,
  createDocument,
  removeDocument,
  renewDefaults,
  renewDocument,
  startManagement,
  updateCounterparty,
  updateDocument,
  type CounterpartyInput,
  type DocumentInput,
  type FieldErrors,
} from '../domain/actions';
import { DOC_TYPES, KIND_LABEL, durationLabel, formatMoney, getDocType, suggestedExpiry } from '../domain/catalog';
import { diffDays, formatLong, isISODate } from '../domain/dates';
import type { Counterparty, CounterpartyKind, DocTypeId, DocumentRecord } from '../domain/types';
import { useStore } from '../state/store';
import { DemoNotice, FormError, Sheet, SelectField, TextArea, TextField } from './ui';

function Footer({ onCancel, submitLabel, formId, danger }: { onCancel: () => void; submitLabel: string; formId: string; danger?: boolean }) {
  return (
    <div className="flex gap-3">
      <button type="button" className="btn-secundario flex-1" onClick={onCancel}>Cancelar</button>
      <button type="submit" form={formId} className={`${danger ? 'btn btn-peligro' : 'btn-primario'} flex-[1.4]`}>{submitLabel}</button>
    </div>
  );
}

/* ---------- Renovar ---------- */

export function RenewSheet({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const { data, today, commit } = useStore();
  const type = getDocType(doc.typeId);
  const [form, setForm] = useState(() => renewDefaults(doc, today));
  const [expiryTouched, setExpiryTouched] = useState(type.duration.unit === 'fecha');
  const [errors, setErrors] = useState<FieldErrors>({});

  const setStart = (startDate: string) => {
    setForm((f) => ({
      ...f,
      startDate,
      expiryDate: !expiryTouched && isISODate(startDate) ? suggestedExpiry(doc.typeId, startDate) ?? f.expiryDate : f.expiryDate,
    }));
  };

  const preview = isISODate(form.expiryDate) ? diffDays(today, form.expiryDate) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = commit(renewDocument(data, doc.id, form, today), 'Renovado y guardado en este navegador.');
    if (r.ok) onClose();
    else setErrors(r.errors);
  };

  return (
    <Sheet title="Renovar documento" onClose={onClose} footer={<Footer onCancel={onClose} submitLabel="Guardar renovación" formId="renew-form" />}>
      <form id="renew-form" onSubmit={submit} noValidate>
        <p className="mb-1 font-display text-lg font-semibold">{doc.title}</p>
        <p className="mb-4 text-sm text-tinto/70">
          Hoy vence el {formatLong(doc.expiryDate)}. Duración habitual: {durationLabel(type)}.
        </p>
        <FormError text={errors.form} />
        <TextField label="Fecha de renovación" type="date" value={form.startDate} max="2100-12-31" onChange={(e) => setStart(e.target.value)} error={errors.startDate} />
        <TextField
          label="Nuevo vencimiento"
          type="date"
          value={form.expiryDate}
          onChange={(e) => {
            setExpiryTouched(true);
            setForm((f) => ({ ...f, expiryDate: e.target.value }));
          }}
          error={errors.expiryDate}
          hint={
            type.duration.unit === 'fecha'
              ? 'Este permiso vence en la fecha del evento.'
              : preview != null
                ? `Se calcula con la duración habitual. Quedan ${preview} días.`
                : undefined
          }
        />
        <TextField
          label={type.refAmount == null ? 'Monto (opcional)' : 'Monto pagado'}
          inputMode="numeric"
          placeholder={type.refAmount == null ? 'Sin monto' : String(type.refAmount)}
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          error={errors.amount}
          hint={type.refAmount != null ? `Referencia: ${formatMoney(type.refAmount)}${type.perUnit ? ` ${type.perUnit}` : ''}.` : 'Este tipo de documento no lleva monto.'}
        />
        <TextArea label="Nota para el historial (opcional)" placeholder="Ej.: Pagado en la ventanilla de comercio" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        <DemoNotice />
      </form>
    </Sheet>
  );
}

/* ---------- En gestión ---------- */

export function ManageSheet({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const { data, today, commit } = useStore();
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = commit(startManagement(data, doc.id, note, today), 'Marcado En gestión.');
    if (r.ok) onClose();
    else setErrors(r.errors);
  };
  return (
    <Sheet title="Pasar a En gestión" onClose={onClose} footer={<Footer onCancel={onClose} submitLabel="Marcar En gestión" formId="manage-form" />}>
      <form id="manage-form" onSubmit={submit} noValidate>
        <p className="mb-1 font-display text-lg font-semibold">{doc.title}</p>
        <p className="mb-4 text-sm text-tinto/70">
          Conserva la fecha ({formatLong(doc.expiryDate)}), deja de sumar en los avisos y aparece en el filtro En gestión.
        </p>
        <FormError text={errors.form} />
        <TextArea label="¿Qué se hizo? (opcional)" placeholder="Ej.: Llamamos y quedaron en mandar la póliza" value={note} onChange={(e) => setNote(e.target.value)} />
        <DemoNotice />
      </form>
    </Sheet>
  );
}

/* ---------- Dar de baja documento ---------- */

export function RemoveDocSheet({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const { data, today, commit } = useStore();
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = commit(removeDocument(data, doc.id, reason, today), 'Documento dado de baja.');
    if (r.ok) onClose();
    else setErrors(r.errors);
  };
  return (
    <Sheet title="Dar de baja documento" onClose={onClose} footer={<Footer onCancel={onClose} submitLabel="Dar de baja" formId="remove-doc-form" danger />}>
      <form id="remove-doc-form" onSubmit={submit} noValidate>
        <p className="mb-1 font-display text-lg font-semibold">{doc.title}</p>
        <p className="mb-4 text-sm text-tinto/70">Ya no aplica: deja de generar avisos y no frena la baja de su contraparte. Queda en el filtro Dados de baja.</p>
        <FormError text={errors.form} />
        <TextField label="Motivo" placeholder="Ej.: Llegó la lista nueva" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
        <DemoNotice />
      </form>
    </Sheet>
  );
}

/* ---------- Alta de documento ---------- */

export function DocumentFormSheet({ onClose, onCreated, presetCounterpartyId }: { onClose: () => void; onCreated?: (id: string) => void; presetCounterpartyId?: string }) {
  const { data, today, commit } = useStore();
  const active = useMemo(() => data.counterparties.filter((c) => c.status === 'activa'), [data.counterparties]);
  const [form, setForm] = useState<DocumentInput>({
    counterpartyId: presetCounterpartyId ?? '',
    typeId: '',
    title: '',
    startDate: today,
    expiryDate: '',
    amount: '',
    location: '',
    notes: '',
  });
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [errors, setErrors] = useState<FieldErrors>({});

  const cp = active.find((c) => c.id === form.counterpartyId);
  const types = cp ? DOC_TYPES.filter((t) => t.kinds.includes(cp.kind)) : DOC_TYPES;
  const type = form.typeId ? getDocType(form.typeId) : null;

  const recalc = (next: DocumentInput, qty = quantity): DocumentInput => {
    if (!next.typeId) return next;
    const t = getDocType(next.typeId);
    const exp = !expiryTouched && isISODate(next.startDate) ? suggestedExpiry(t.id, next.startDate) : null;
    return { ...next, expiryDate: exp ?? next.expiryDate, amount: t.refAmount != null && t.perUnit ? String(t.refAmount * Math.max(1, Number(qty) || 1)) : next.amount };
  };

  const chooseType = (typeId: DocTypeId | '') => {
    if (!typeId) return setForm((f) => ({ ...f, typeId }));
    const t = getDocType(typeId);
    setExpiryTouched(t.duration.unit === 'fecha');
    setForm((f) => {
      const exp = isISODate(f.startDate) ? suggestedExpiry(t.id, f.startDate) : null;
      return {
        ...f,
        typeId,
        title: f.title && !DOC_TYPES.some((d) => d.shortName === f.title) ? f.title : t.shortName,
        expiryDate: exp ?? '',
        amount: t.refAmount != null ? String(t.refAmount * (t.perUnit ? Math.max(1, Number(quantity) || 1) : 1)) : '',
      };
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = commit(createDocument(data, form, today), 'Documento guardado en este navegador.');
    if (r.ok) {
      onClose();
      if (r.id) onCreated?.(r.id);
    } else setErrors(r.errors);
  };

  return (
    <Sheet title="Nuevo documento" onClose={onClose} footer={<Footer onCancel={onClose} submitLabel="Guardar documento" formId="doc-form" />}>
      <form id="doc-form" onSubmit={submit} noValidate>
        <p className="mb-4 text-sm text-tinto/70">No se sube el archivo: anotá los datos del papel y dónde está el original.</p>
        <FormError text={errors.form} />
        <SelectField
          label="¿De quién es?"
          value={form.counterpartyId}
          onChange={(e) => {
            const next = active.find((c) => c.id === e.target.value);
            setForm((f) => ({ ...f, counterpartyId: e.target.value, typeId: next && f.typeId && !getDocType(f.typeId).kinds.includes(next.kind) ? '' : f.typeId }));
          }}
          error={errors.counterpartyId}
        >
          <option value="">Elegí una contraparte</option>
          {active.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {KIND_LABEL[c.kind]}</option>
          ))}
        </SelectField>
        <SelectField label="Tipo de documento" value={form.typeId} onChange={(e) => chooseType(e.target.value as DocTypeId | '')} error={errors.typeId}>
          <option value="">Elegí el tipo</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </SelectField>
        {type && (
          <p className="-mt-2 mb-4 text-[13px] text-tinto/65">
            Dura {durationLabel(type)} · avisa {type.warnDays} días antes · {type.refAmount != null ? `${formatMoney(type.refAmount)}${type.perUnit ? ` ${type.perUnit}` : ''}` : 'sin monto'}.
          </p>
        )}
        <TextField label="Nombre para reconocerlo" placeholder="Ej.: Matafuegos de la barra" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <div className="grid grid-cols-1 gap-x-3 min-[400px]:grid-cols-2">
          <TextField label="Rige desde" type="date" value={form.startDate} onChange={(e) => setForm((f) => recalc({ ...f, startDate: e.target.value }))} error={errors.startDate} />
          <TextField
            label={type?.duration.unit === 'fecha' ? 'Fecha del evento' : 'Vence el'}
            type="date"
            value={form.expiryDate}
            onChange={(e) => {
              setExpiryTouched(true);
              setForm((f) => ({ ...f, expiryDate: e.target.value }));
            }}
            error={errors.expiryDate}
          />
        </div>
        {type?.perUnit && (
          <TextField
            label="Cantidad de equipos"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setForm((f) => recalc(f, e.target.value));
            }}
            hint="Conviene cargar un documento por equipo: cada uno tiene su tarjeta."
          />
        )}
        <TextField
          label={type && type.refAmount == null ? 'Monto (opcional)' : 'Monto'}
          inputMode="numeric"
          placeholder={type && type.refAmount == null ? 'Sin monto' : 'Ej.: 28000'}
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          error={errors.amount}
        />
        <TextField label="¿Dónde está el original?" placeholder="Ej.: Original en la carpeta azul" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} error={errors.location} />
        <TextArea label="Notas (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <DemoNotice />
      </form>
    </Sheet>
  );
}

/* ---------- Editar documento ---------- */

export function DocumentEditSheet({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const { data, today, commit } = useStore();
  const [form, setForm] = useState({ title: doc.title, location: doc.location, notes: doc.notes });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = commit(updateDocument(data, doc.id, form, today), 'Cambios guardados.');
    if (r.ok) onClose();
    else setErrors(r.errors);
  };
  return (
    <Sheet title="Editar datos" onClose={onClose} footer={<Footer onCancel={onClose} submitLabel="Guardar cambios" formId="edit-doc-form" />}>
      <form id="edit-doc-form" onSubmit={submit} noValidate>
        <p className="mb-4 text-sm text-tinto/70">Las fechas y el monto cambian con «Renovar», así quedan en el historial.</p>
        <FormError text={errors.form} />
        <TextField label="Nombre" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={errors.title} />
        <TextField label="¿Dónde está el original?" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} error={errors.location} />
        <TextArea label="Notas" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <DemoNotice />
      </form>
    </Sheet>
  );
}

/* ---------- Contraparte: alta y edición ---------- */

export function CounterpartyFormSheet({ existing, onClose, onSaved }: { existing?: Counterparty; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, today, commit } = useStore();
  const [form, setForm] = useState<CounterpartyInput>({
    name: existing?.name ?? '',
    kind: existing?.kind ?? '',
    contact: existing?.contact ?? '',
    notes: existing?.notes ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = existing ? updateCounterparty(data, existing.id, form) : createCounterparty(data, form, today);
    const r = commit(result, existing ? 'Contraparte actualizada.' : 'Contraparte guardada en este navegador.');
    if (r.ok) {
      onClose();
      if (r.id) onSaved?.(r.id);
    } else setErrors(r.errors);
  };
  return (
    <Sheet title={existing ? 'Editar contraparte' : 'Nueva contraparte'} onClose={onClose} footer={<Footer onCancel={onClose} submitLabel={existing ? 'Guardar cambios' : 'Guardar contraparte'} formId="cp-form" />}>
      <form id="cp-form" onSubmit={submit} noValidate>
        <FormError text={errors.form} />
        <TextField label="Nombre" placeholder="Ej.: Bodega Las Toscas" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} />
        <SelectField label="Tipo" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CounterpartyKind | '' }))} error={errors.kind}>
          <option value="">Elegí el tipo</option>
          {(Object.keys(KIND_LABEL) as CounterpartyKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </SelectField>
        <TextField label="¿Cómo ubicarla?" placeholder="Ej.: Vendedor de zona, pasa los martes" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} hint="Una referencia para saber a quién llamar. La app no manda mensajes." />
        <TextArea label="Notas (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <DemoNotice />
      </form>
    </Sheet>
  );
}

/* ---------- Confirmación genérica ---------- */

export function ConfirmSheet({ title, text, confirmLabel, danger, onConfirm, onClose }: { title: string; text: string; confirmLabel: string; danger?: boolean; onConfirm: () => boolean; onClose: () => void }) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (onConfirm()) onClose();
  };
  return (
    <Sheet title={title} onClose={onClose} footer={<Footer onCancel={onClose} submitLabel={confirmLabel} formId="confirm-form" danger={danger} />}>
      <form id="confirm-form" onSubmit={submit}>
        <p className="mb-4 text-[15px]">{text}</p>
        <DemoNotice />
      </form>
    </Sheet>
  );
}
