import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import {
    formatDateShort,
    formatDateTime,
    localTodayIso,
    paymentMethodLabels,
    paymentStatusBadgeClasses,
    paymentStatusLabels,
    statusBadgeClasses,
    statusLabels,
} from '@/lib/appointments';
import { formatMoney } from '@/lib/money';
import { type AppointmentRequest, type PatientNote, type PatientSummary, type Payment } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, Check, LoaderCircle, Pencil, Plus, ReceiptText, Save, StickyNote, UserRound, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface PatientShowProps {
    patient: PatientSummary;
    summary: {
        appointments_count: number;
        attended_count: number;
        total_paid_cents: number;
        outstanding_cents: number;
        last_appointment_at: string | null;
    };
    appointments: AppointmentRequest[];
    payments: Payment[];
    notes: PatientNote[];
}

function NoteItem({ patientId, note }: { patientId: number; note: PatientNote }) {
    const [editing, setEditing] = useState(false);

    const form = useForm({ body: note.body });

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(route('admin.patients.notes.update', [patientId, note.id]), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    return (
        <li className="rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">{formatDateShort(note.noted_at)}</p>

                    {note.appointment && (
                        <Link
                            href={`/admin/solicitudes/${note.appointment.id}`}
                            className="mt-0.5 block text-xs font-semibold text-[#706a67] underline-offset-4 hover:text-[#6f826c] hover:underline"
                        >
                            {note.appointment.service}
                            {note.appointment.confirmed_start ? ` · ${formatDateTime(note.appointment.confirmed_start)}` : ''}
                        </Link>
                    )}
                </div>

                {!editing && (
                    <button
                        type="button"
                        onClick={() => {
                            form.setData('body', note.body);
                            setEditing(true);
                        }}
                        className="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-bold text-[#706a67] hover:text-[#c98796]"
                    >
                        <Pencil className="size-3.5" />
                        Editar
                    </button>
                )}
            </div>

            {editing ? (
                <form onSubmit={handleSubmit} className="mt-3 space-y-2">
                    <label htmlFor={`note-body-${note.id}`} className="sr-only">
                        Editar nota
                    </label>

                    <textarea
                        id={`note-body-${note.id}`}
                        rows={4}
                        value={form.data.body}
                        onChange={(event) => form.setData('body', event.target.value)}
                        className="w-full rounded-xl border border-[#ded4d4] bg-white px-3 py-2.5 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                    />

                    <InputError message={form.errors.body} />

                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={form.processing}
                            size="sm"
                            className="rounded-full bg-[#7d8f7a] px-4 text-xs font-bold text-white hover:bg-[#6f826c]"
                        >
                            {form.processing ? <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
                            Guardar
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(false)}
                            className="rounded-full border-[#eadedf] px-4 text-xs font-semibold text-[#706a67]"
                        >
                            <X className="mr-1.5 size-3.5" />
                            Cancelar
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#373432]">{note.body}</p>
            )}

            {note.author_name && <p className="mt-2 text-[11px] text-[#706a67]">Registrada por {note.author_name}</p>}

            {note.revisions.length > 0 && (
                <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[#706a67]">
                        Historial de cambios ({note.revisions.length})
                    </summary>

                    <ul className="mt-2 space-y-2 border-t border-[#eadedf] pt-2">
                        {note.revisions.map((revision) => (
                            <li key={revision.id} className="rounded-lg bg-white px-3 py-2">
                                <p className="text-[11px] text-[#706a67]">
                                    {formatDateTime(revision.created_at)}
                                    {revision.edited_by_name ? ` · ${revision.edited_by_name}` : ''}
                                </p>
                                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#373432]">{revision.body}</p>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </li>
    );
}

export default function PatientShow({ patient, summary, appointments, payments, notes }: PatientShowProps) {
    const editForm = useForm({
        name: patient.name,
        phone: patient.phone ?? '',
    });

    const noteForm = useForm({
        body: '',
        noted_at: localTodayIso(),
        appointment_id: '' as number | '',
    });

    const handleEdit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        editForm.patch(route('admin.patients.update', patient.id), { preserveScroll: true });
    };

    const handleNote = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        noteForm.post(route('admin.patients.notes.store', patient.id), {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset();
                noteForm.setData('noted_at', localTodayIso());
            },
        });
    };

    const appointmentOptions = appointments.filter((appointment) => appointment.confirmed_start || appointment.created_at);

    return (
        <AdminLayout>
            <div className="mb-8 flex flex-col gap-4">
                <Link
                    href="/admin/pacientes"
                    className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#706a67] transition-colors hover:text-[#d99aa8]"
                >
                    <ArrowLeft className="size-4" />
                    Volver a pacientes
                </Link>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl tracking-[-0.03em] text-[#373432] sm:text-4xl">{patient.name}</h1>
                        <p className="mt-2 text-sm text-[#706a67]">{patient.phone ?? 'Sin teléfono registrado'}</p>
                    </div>

                    <p className="text-xs text-[#706a67]">
                        Paciente desde {formatDateShort(patient.created_at)}
                    </p>
                </div>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-[#373432]">{summary.appointments_count}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Citas en total</p>
                </div>

                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-[#51634e]">{summary.attended_count}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Atendidas</p>
                </div>

                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-[#6f826c]">{formatMoney(summary.total_paid_cents)}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Pagado</p>
                </div>

                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className={`text-2xl font-semibold tracking-[-0.03em] ${summary.outstanding_cents > 0 ? 'text-[#c98796]' : 'text-[#6f826c]'}`}>
                        {formatMoney(summary.outstanding_cents)}
                    </p>
                    <p className="mt-1 text-xs text-[#706a67]">Saldo pendiente</p>
                </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    {/* Appointments */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="appointments-heading">
                        <h2 id="appointments-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <CalendarDays className="size-5 text-[#7d8f7a]" />
                            Historial de citas
                        </h2>

                        {appointments.length === 0 ? (
                            <p className="mt-4 text-sm text-[#706a67]">Este paciente aún no tiene citas registradas.</p>
                        ) : (
                            <ul className="mt-4 divide-y divide-[#eadedf]">
                                {appointments.map((appointment) => (
                                    <li key={appointment.id}>
                                        <Link
                                            href={`/admin/solicitudes/${appointment.id}`}
                                            className="flex flex-col gap-2 py-3.5 transition-colors hover:text-[#6f826c] sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[#373432]">{appointment.service}</p>
                                                <p className="mt-0.5 text-xs text-[#706a67]">
                                                    {appointment.confirmed_start ? formatDateTime(appointment.confirmed_start) : `Registrada el ${formatDateShort(appointment.created_at)}`}
                                                    {appointment.duration_minutes ? ` · ${appointment.duration_minutes} min` : ''}
                                                </p>
                                                {appointment.service_value_cents !== null && (
                                                    <p className="mt-0.5 text-xs text-[#706a67]">
                                                        {formatMoney(appointment.total_paid_cents)} pagados
                                                        {appointment.balance_cents !== null && appointment.balance_cents > 0
                                                            ? ` · saldo ${formatMoney(appointment.balance_cents)}`
                                                            : ''}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses[appointment.status]}`}
                                                >
                                                    {statusLabels[appointment.status]}
                                                </Badge>

                                                {appointment.service_value_cents !== null && (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${paymentStatusBadgeClasses[appointment.payment_status]}`}
                                                    >
                                                        {paymentStatusLabels[appointment.payment_status]}
                                                    </Badge>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Notes */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="notes-heading">
                        <h2 id="notes-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <StickyNote className="size-5 text-[#7d8f7a]" />
                            Notas de seguimiento
                        </h2>

                        <p className="mt-1 text-sm text-[#706a67]">
                            Notas privadas del panel. No sustituyen una historia clínica formal y nunca se publican en el sitio web.
                        </p>

                        <form onSubmit={handleNote} className="mt-4 space-y-3 rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4">
                            <div className="space-y-1.5">
                                <label htmlFor="note-body" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Nueva nota
                                </label>

                                <textarea
                                    id="note-body"
                                    rows={3}
                                    value={noteForm.data.body}
                                    onChange={(event) => noteForm.setData('body', event.target.value)}
                                    placeholder="Observaciones de seguimiento, acuerdos, recomendaciones…"
                                    className="w-full rounded-xl border border-[#ded4d4] bg-white px-3 py-2.5 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={noteForm.errors.body} />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label htmlFor="note-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                        Fecha de la nota
                                    </label>

                                    <input
                                        id="note-date"
                                        type="date"
                                        value={noteForm.data.noted_at}
                                        max={localTodayIso()}
                                        onChange={(event) => noteForm.setData('noted_at', event.target.value)}
                                        className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                    />

                                    <InputError message={noteForm.errors.noted_at} />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="note-appointment" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                        Cita relacionada (opcional)
                                    </label>

                                    <select
                                        id="note-appointment"
                                        value={noteForm.data.appointment_id}
                                        onChange={(event) =>
                                            noteForm.setData('appointment_id', event.target.value === '' ? '' : Number(event.target.value))
                                        }
                                        className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                    >
                                        <option value="">Sin cita relacionada</option>

                                        {appointmentOptions.map((appointment) => (
                                            <option key={appointment.id} value={appointment.id}>
                                                {appointment.service} ·{' '}
                                                {appointment.confirmed_start
                                                    ? formatDateShort(appointment.confirmed_start)
                                                    : formatDateShort(appointment.created_at)}
                                            </option>
                                        ))}
                                    </select>

                                    <InputError message={noteForm.errors.appointment_id} />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={noteForm.processing}
                                className="rounded-full bg-[#7d8f7a] px-5 text-sm font-bold text-white hover:bg-[#6f826c]"
                            >
                                {noteForm.processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                                Agregar nota
                            </Button>
                        </form>

                        {notes.length === 0 ? (
                            <p className="mt-4 text-sm text-[#706a67]">Todavía no hay notas de seguimiento.</p>
                        ) : (
                            <ul className="mt-4 space-y-3">
                                {notes.map((note) => (
                                    <NoteItem key={note.id} patientId={patient.id} note={note} />
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <div className="space-y-6">
                    {/* Contact */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="contact-heading">
                        <h2 id="contact-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <UserRound className="size-5 text-[#7d8f7a]" />
                            Datos de contacto
                        </h2>

                        <form onSubmit={handleEdit} className="mt-4 space-y-3">
                            <div className="space-y-1.5">
                                <label htmlFor="patient-name" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Nombre
                                </label>

                                <input
                                    id="patient-name"
                                    type="text"
                                    value={editForm.data.name}
                                    onChange={(event) => editForm.setData('name', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={editForm.errors.name} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="patient-phone" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Teléfono
                                </label>

                                <input
                                    id="patient-phone"
                                    type="tel"
                                    value={editForm.data.phone}
                                    onChange={(event) => editForm.setData('phone', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={editForm.errors.phone} />
                            </div>

                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className="w-full rounded-full bg-[#373432] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4d4744]"
                            >
                                {editForm.processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                                Guardar datos
                            </Button>
                        </form>
                    </section>

                    {/* Payments */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="payments-heading">
                        <h2 id="payments-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <ReceiptText className="size-5 text-[#7d8f7a]" />
                            Pagos registrados
                        </h2>

                        {payments.length === 0 ? (
                            <p className="mt-4 text-sm text-[#706a67]">Todavía no hay pagos registrados.</p>
                        ) : (
                            <ul className="mt-4 divide-y divide-[#eadedf]">
                                {payments.map((payment) => (
                                    <li key={payment.id} className={`py-3 ${payment.voided_at ? 'opacity-60' : ''}`}>
                                        <p className={`text-sm font-bold ${payment.voided_at ? 'text-[#706a67] line-through' : 'text-[#373432]'}`}>
                                            {formatMoney(payment.amount_cents)} · {paymentMethodLabels[payment.method ?? ''] ?? 'Sin método'}
                                        </p>

                                        <p className="text-xs text-[#706a67]">
                                            {formatDateShort(payment.paid_on)}
                                            {payment.appointment ? ` · ${payment.appointment.service}` : ''}
                                        </p>

                                        {payment.voided_at && (
                                            <p className="mt-1 text-xs font-semibold text-[#a14444]">Anulado: {payment.void_reason}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {summary.last_appointment_at && (
                        <p className="text-xs leading-5 text-[#706a67]">Última cita: {formatDateTime(summary.last_appointment_at)}</p>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
