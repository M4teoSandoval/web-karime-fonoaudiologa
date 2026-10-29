import AppointmentPayments from '@/components/admin/appointment-payments';
import AppointmentRescheduleHistory from '@/components/admin/appointment-reschedule-history';
import PatientFields from '@/components/admin/patient-fields';
import RescheduleAppointmentDialog from '@/components/admin/reschedule-appointment-dialog';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import {
    formatDate,
    formatDateTime,
    formatTime,
    localTodayIso,
    paymentStatusBadgeClasses,
    paymentStatusLabels,
    statusBadgeClasses,
    statusLabels,
} from '@/lib/appointments';
import { copyToClipboard } from '@/lib/clipboard';
import { centsToInput, formatMoney, inputToCents } from '@/lib/money';
import { type AppointmentRequest, type PatientSummary, type ProposedSlot } from '@/types';
import { Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarCheck,
    CalendarSearch,
    Check,
    CircleX,
    ClipboardCheck,
    Copy,
    LoaderCircle,
    ReceiptText,
    Save,
    Trash2,
    UserRound,
    Wallet,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface RequestShowProps {
    appointment: AppointmentRequest;
}

const durationOptions = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

type CopyTarget = 'proposal' | 'confirmation';

function newKey(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function RequestShow({ appointment }: RequestShowProps) {
    const [date, setDate] = useState<string>(localTodayIso());
    const [slots, setSlots] = useState<ProposedSlot[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [copied, setCopied] = useState<CopyTarget | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(appointment.patient ?? null);

    const isManageable = appointment.status === 'pending' || appointment.status === 'slots_proposed';
    const isConfirmed = appointment.status === 'confirmed';
    const balance = appointment.balance_cents ?? 0;

    const details = useForm({
        duration_minutes: appointment.duration_minutes,
        service_value: centsToInput(appointment.service_value_cents),
        notes: appointment.notes ?? '',
    });

    const attendance = useForm({
        register_payment: balance > 0,
        payment_amount: balance > 0 ? centsToInput(balance) : '',
        payment_paid_on: localTodayIso(),
        payment_method: '',
        payment_notes: '',
        payment_idempotency_key: newKey(),
    });

    const assignPatient = useForm({
        patient_mode: 'existing' as 'existing' | 'new',
        patient_id: '' as number | '',
        patient_name: '',
        patient_phone: '',
        allow_duplicate_phone: false as boolean,
    });

    useEffect(() => {
        if (!isManageable) {
            return undefined;
        }

        const controller = new AbortController();

        const load = async () => {
            setLoadingSlots(true);
            setSlotsError(null);

            try {
                const params = new URLSearchParams({
                    date,
                    duration: String(details.data.duration_minutes),
                    exclude: String(appointment.id),
                });

                const response = await fetch(`${route('admin.availability.show')}?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('request failed');
                }

                const json = (await response.json()) as { slots: ProposedSlot[] };

                setSlots(json.slots);
                setSelected([]);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setSlotsError('No fue posible cargar la disponibilidad. Intenta de nuevo.');
                }
            } finally {
                setLoadingSlots(false);
            }
        };

        void load();

        return () => controller.abort();
    }, [date, details.data.duration_minutes, appointment.id, isManageable]);

    const toggleSlot = (start: string) => {
        setSelected((current) => (current.includes(start) ? current.filter((item) => item !== start) : [...current, start]));
    };

    const handleSaveDetails = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        details.patch(route('admin.requests.update', appointment.id), { preserveScroll: true });
    };

    const handlePropose = () => {
        if (selected.length === 0) {
            return;
        }

        router.post(route('admin.requests.propose', appointment.id), { slots: selected }, { preserveScroll: true });
    };

    const handleConfirm = (start: string) => {
        if (!window.confirm(`¿Confirmar la cita el ${formatDateTime(start)}? El horario quedará reservado definitivamente.`)) {
            return;
        }

        router.post(route('admin.requests.confirm', appointment.id), { start }, { preserveScroll: true });
    };

    const handleCancel = () => {
        if (!window.confirm(`¿Cancelar la cita de ${appointment.patient_name}? Esta acción libera el horario reservado.`)) {
            return;
        }

        router.post(route('admin.requests.cancel', appointment.id), {}, { preserveScroll: true });
    };

    const handleAttended = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        attendance.post(route('admin.requests.attend', appointment.id), {
            preserveScroll: true,
            onSuccess: () => {
                attendance.setData('payment_idempotency_key', newKey());
                attendance.reset('payment_amount', 'payment_notes', 'payment_method');
            },
        });
    };

    const handleNoShow = () => {
        if (!window.confirm(`¿Marcar la cita de ${appointment.patient_name} como no realizada? No se borrará el historial.`)) {
            return;
        }

        router.post(route('admin.requests.no-show', appointment.id), {}, { preserveScroll: true });
    };

    const handleAssignPatient = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        assignPatient.post(route('admin.requests.assign-patient', appointment.id), { preserveScroll: true });
    };

    const proposalMessage = appointment.proposal_message ?? null;
    const confirmationMessage = appointment.confirmation_message ?? null;

    /**
     * Copia un mensaje al portapapeles. Solo actúa sobre el portapapeles:
     * no modifica el estado de la cita.
     */
    const handleCopy = async (target: CopyTarget, message: string) => {
        const ok = await copyToClipboard(message);

        if (!ok) {
            return;
        }

        setCopied(target);

        window.setTimeout(() => setCopied((current) => (current === target ? null : current)), 2500);
    };

    const effectiveDuration = details.data.duration_minutes;
    const estimatedServiceValue = inputToCents(details.data.service_value);
    const isClosed = appointment.status === 'cancelled' || appointment.status === 'no_show';

    return (
        <AdminLayout>
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4">
                <Link
                    href="/admin/solicitudes"
                    className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#706a67] transition-colors hover:text-[#d99aa8]"
                >
                    <ArrowLeft className="size-4" />
                    Volver a solicitudes
                </Link>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-3xl tracking-[-0.03em] text-[#373432] sm:text-4xl">{appointment.patient_name}</h1>

                        <p className="mt-2 text-sm text-[#706a67]">
                            {appointment.service} · Registrada el {formatDate(appointment.created_at)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                                variant="secondary"
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${statusBadgeClasses[appointment.status]}`}
                            >
                                {statusLabels[appointment.status]}
                            </Badge>

                            {appointment.service_value_cents !== null && (
                                <Badge
                                    variant="secondary"
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${paymentStatusBadgeClasses[appointment.payment_status]}`}
                                >
                                    {paymentStatusLabels[appointment.payment_status]}
                                </Badge>
                            )}

                            {appointment.patient && (
                                <Link
                                    href={`/admin/pacientes/${appointment.patient.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-3.5 py-1.5 text-xs font-bold text-[#706a67] transition-colors hover:border-[#7d8f7a] hover:text-[#6f826c]"
                                >
                                    <UserRound className="size-3.5" />
                                    Ver perfil del paciente
                                </Link>
                            )}
                        </div>

                        {appointment.patient_phone && <p className="mt-2 text-sm text-[#706a67]">Teléfono: {appointment.patient_phone}</p>}
                    </div>

                    <div className="grid shrink-0 grid-cols-3 gap-2 rounded-2xl border border-[#eadedf] bg-white p-4 text-center sm:min-w-[320px]">
                        <div>
                            <p className="text-[11px] font-bold tracking-wide text-[#7d8f7a] uppercase">Valor</p>
                            <p className="mt-1 text-sm font-bold text-[#373432]">{formatMoney(appointment.service_value_cents)}</p>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold tracking-wide text-[#7d8f7a] uppercase">Pagado</p>
                            <p className="mt-1 text-sm font-bold text-[#6f826c]">{formatMoney(appointment.total_paid_cents)}</p>
                        </div>

                        <div>
                            <p className="text-[11px] font-bold tracking-wide text-[#7d8f7a] uppercase">Saldo</p>
                            <p className="mt-1 text-sm font-bold text-[#c98796]">
                                {appointment.balance_cents === null ? '—' : formatMoney(balance)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {isClosed && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#eadedf] bg-white p-5">
                    <CircleX className="mt-0.5 size-5 shrink-0 text-[#c98796]" />

                    <div>
                        <p className="text-sm font-bold text-[#373432]">
                            {appointment.status === 'cancelled' ? 'Cita cancelada' : 'Cita marcada como no realizada'}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-[#706a67]">
                            {appointment.status === 'cancelled'
                                ? `Cancelada el ${formatDateTime(appointment.cancelled_at)}. El horario quedó liberado y los pagos existentes se conservan.`
                                : `Registrada el ${formatDateTime(appointment.no_show_at)}. El espacio sigue en el historial de la agenda.`}
                        </p>
                    </div>
                </div>
            )}

            {appointment.status === 'attended' && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#7d8f7a]/30 bg-[#eef2ed] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <CalendarCheck className="mt-0.5 size-5 shrink-0 text-[#51634e]" />

                        <div>
                            <p className="text-sm font-bold text-[#373432]">Cita atendida</p>
                            <p className="mt-1 text-sm leading-6 text-[#51634e]">
                                Registrada el {formatDateTime(appointment.attended_at)}.
                                {balance > 0 ? ` Queda un saldo pendiente de ${formatMoney(balance)}.` : ' Sin saldo pendiente.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                {/* =================================================
                    MAIN COLUMN
                ================================================= */}
                <div className="space-y-6">
                    {/* Confirmed appointment + attendance */}
                    {isConfirmed && appointment.confirmed_start && (
                        <section className="rounded-2xl border border-[#7d8f7a] bg-[#7d8f7a]/8 p-5 sm:p-6" aria-labelledby="confirmed-heading">
                            <h2 id="confirmed-heading" className="text-lg font-semibold text-[#373432]">
                                Cita confirmada
                            </h2>

                            <p className="mt-2 text-base font-bold text-[#51634e]">{formatDateTime(appointment.confirmed_start)}</p>

                            <p className="mt-1 text-sm text-[#706a67]">
                                Duración: {appointment.duration_minutes} minutos. El horario está reservado en tu agenda.
                            </p>

                            {appointment.can_reschedule && (
                                <div className="mt-4">
                                    <RescheduleAppointmentDialog
                                        appointment={appointment}
                                        triggerClassName="rounded-full border-[#51634e] bg-[#51634e] px-5 text-sm font-bold text-white hover:bg-[#455742]"
                                    />
                                </div>
                            )}

                            {confirmationMessage && (
                                <div className="mt-5 rounded-xl bg-white/70 p-4">
                                    <p className="text-xs font-bold tracking-wide text-[#6f826c] uppercase">Mensaje de confirmación</p>

                                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#373432]">{confirmationMessage}</p>

                                    <Button
                                        type="button"
                                        onClick={() => handleCopy('confirmation', confirmationMessage)}
                                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#7d8f7a] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#6f826c]"
                                    >
                                        {copied === 'confirmation' ? <ClipboardCheck className="size-4" /> : <Copy className="size-4" />}
                                        {copied === 'confirmation' ? 'Mensaje copiado' : 'Copiar mensaje'}
                                    </Button>
                                </div>
                            )}

                            <form onSubmit={handleAttended} className="mt-5 space-y-3 border-t border-[#7d8f7a]/20 pt-5">
                                <p className="text-sm font-bold text-[#373432]">¿Qué pasó con esta cita?</p>

                                <label className="flex items-start gap-2.5 text-sm leading-6 text-[#373432]">
                                    <input
                                        type="checkbox"
                                        checked={attendance.data.register_payment}
                                        onChange={(event) => attendance.setData('register_payment', event.target.checked)}
                                        className="mt-0.5 size-4 rounded border-[#ded4d4] text-[#7d8f7a] focus:ring-[#7d8f7a]"
                                    />
                                    <span>Registrar el pago recibido ahora (puedes dejar el saldo pendiente).</span>
                                </label>

                                {attendance.data.register_payment && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label htmlFor="attend-amount" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                                Importe recibido
                                            </label>

                                            <input
                                                id="attend-amount"
                                                type="text"
                                                inputMode="numeric"
                                                value={attendance.data.payment_amount}
                                                onChange={(event) => attendance.setData('payment_amount', event.target.value)}
                                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                            />

                                            <InputError message={attendance.errors.payment_amount} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="attend-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                                Fecha efectiva
                                            </label>

                                            <input
                                                id="attend-date"
                                                type="date"
                                                value={attendance.data.payment_paid_on}
                                                max={localTodayIso()}
                                                onChange={(event) => attendance.setData('payment_paid_on', event.target.value)}
                                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                            />

                                            <InputError message={attendance.errors.payment_paid_on} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="attend-method" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                                Método (opcional)
                                            </label>

                                            <select
                                                id="attend-method"
                                                value={attendance.data.payment_method}
                                                onChange={(event) => attendance.setData('payment_method', event.target.value)}
                                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                            >
                                                <option value="">Sin especificar</option>
                                                <option value="cash">Efectivo</option>
                                                <option value="transfer">Transferencia</option>
                                                <option value="card">Tarjeta</option>
                                                <option value="other">Otro</option>
                                            </select>

                                            <InputError message={attendance.errors.payment_method} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="attend-notes" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                                Observación (opcional)
                                            </label>

                                            <input
                                                id="attend-notes"
                                                type="text"
                                                value={attendance.data.payment_notes}
                                                onChange={(event) => attendance.setData('payment_notes', event.target.value)}
                                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                            />

                                            <InputError message={attendance.errors.payment_notes} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                                    <Button
                                        type="submit"
                                        disabled={attendance.processing}
                                        className="rounded-full bg-[#51634e] px-5 text-sm font-bold text-white hover:bg-[#455742]"
                                    >
                                        {attendance.processing ? (
                                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                                        ) : (
                                            <CalendarCheck className="mr-2 size-4" />
                                        )}
                                        Marcar como atendida
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleNoShow}
                                        className="rounded-full border-[#d99aa8] bg-white text-sm font-bold text-[#c98796] hover:bg-[#fdeef1]"
                                    >
                                        <CircleX className="mr-2 size-4" />
                                        No realizada
                                    </Button>
                                </div>
                            </form>
                        </section>
                    )}

                    {/* Historial de reprogramaciones (visible también para citas cerradas) */}
                    <AppointmentRescheduleHistory appointment={appointment} />

                    {/* Availability (only before confirmation) */}
                    {isManageable && (
                        <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="availability-heading">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 id="availability-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                                        <CalendarSearch className="size-5 text-[#7d8f7a]" />
                                        Espacios disponibles
                                    </h2>

                                    <p className="mt-1 text-sm text-[#706a67]">
                                        Selecciona uno o varios horarios para proponerlos al paciente. Una propuesta no reserva el espacio.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="slot-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                        Fecha
                                    </label>

                                    <input
                                        id="slot-date"
                                        type="date"
                                        value={date}
                                        min={localTodayIso()}
                                        onChange={(event) => setDate(event.target.value)}
                                        className="h-11 rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-5" aria-live="polite">
                                {loadingSlots ? (
                                    <div className="flex items-center gap-2 py-6 text-sm text-[#706a67]">
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Calculando disponibilidad…
                                    </div>
                                ) : slotsError ? (
                                    <p className="py-4 text-sm font-semibold text-[#a14444]">{slotsError}</p>
                                ) : slots.length === 0 ? (
                                    <p className="py-4 text-sm text-[#706a67]">
                                        No hay espacios libres este día con la duración configurada ({effectiveDuration} min). Prueba otra fecha o
                                        ajusta la duración.
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            {slots.map((slot) => {
                                                const isSelected = selected.includes(slot.start);

                                                return (
                                                    <button
                                                        key={slot.start}
                                                        type="button"
                                                        onClick={() => toggleSlot(slot.start)}
                                                        aria-pressed={isSelected}
                                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                                            isSelected
                                                                ? 'border-[#7d8f7a] bg-[#7d8f7a] text-white'
                                                                : 'border-[#eadedf] bg-[#fcfaf9] text-[#373432] hover:border-[#7d8f7a] hover:text-[#6f826c]'
                                                        }`}
                                                    >
                                                        {formatTime(slot.start)}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={handlePropose}
                                            disabled={selected.length === 0}
                                            className="mt-5 rounded-full bg-[#7d8f7a] px-6 text-sm font-bold text-white hover:bg-[#6f826c]"
                                        >
                                            Proponer {selected.length > 0 ? `${selected.length} horario(s)` : 'horarios'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Proposed slots */}
                    {isManageable && appointment.proposed_slots && appointment.proposed_slots.length > 0 && (
                        <section className="rounded-2xl border border-[#7d8f7a]/30 bg-white p-5 sm:p-6" aria-labelledby="proposed-heading">
                            <h2 id="proposed-heading" className="text-lg font-semibold text-[#373432]">
                                Horarios propuestos
                            </h2>

                            <p className="mt-1 text-sm text-[#706a67]">
                                Copia el mensaje y envíalo al paciente por el canal que prefieras. Cuando responda, confirma el horario acordado
                                desde aquí.
                            </p>

                            <ul className="mt-4 space-y-2">
                                {appointment.proposed_slots.map((slot) => (
                                    <li
                                        key={slot.start}
                                        className="flex flex-col gap-3 rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <span className="text-sm font-semibold text-[#373432]">{formatDateTime(slot.start)}</span>

                                        <button
                                            type="button"
                                            onClick={() => handleConfirm(slot.start)}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-[#7d8f7a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6f826c]"
                                        >
                                            <Check className="size-3.5" />
                                            Confirmar este horario
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {proposalMessage && (
                                <div className="mt-5 rounded-xl bg-[#f4e7e8]/60 p-4">
                                    <p className="text-xs font-bold tracking-wide text-[#c98796] uppercase">Mensaje para el paciente</p>

                                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#373432]">{proposalMessage}</p>

                                    <Button
                                        type="button"
                                        onClick={() => handleCopy('proposal', proposalMessage)}
                                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#373432] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4d4744]"
                                    >
                                        {copied === 'proposal' ? <ClipboardCheck className="size-4" /> : <Copy className="size-4" />}
                                        {copied === 'proposal' ? 'Mensaje copiado' : 'Copiar mensaje'}
                                    </Button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Payments */}
                    <AppointmentPayments appointment={appointment} />
                </div>

                {/* =================================================
                    SIDEBAR
                ================================================= */}
                <div className="space-y-6">
                    {/* Patient */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="patient-heading">
                        <h2 id="patient-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <UserRound className="size-5 text-[#7d8f7a]" />
                            Paciente
                        </h2>

                        {appointment.patient ? (
                            <div className="mt-3 space-y-1">
                                <Link
                                    href={`/admin/pacientes/${appointment.patient.id}`}
                                    className="text-sm font-bold text-[#373432] underline-offset-4 hover:text-[#6f826c] hover:underline"
                                >
                                    {appointment.patient.name}
                                </Link>

                                <p className="text-sm text-[#706a67]">{appointment.patient.phone ?? 'Sin teléfono registrado'}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAssignPatient} className="mt-3 space-y-4">
                                <p className="text-sm leading-6 text-[#706a67]">
                                    Esta solicitud aún no está vinculada a un paciente. Búscalo o crea su registro para conservar el historial.
                                </p>

                                <PatientFields
                                    mode={assignPatient.data.patient_mode}
                                    onModeChange={(mode) => {
                                        assignPatient.setData('patient_mode', mode);
                                        assignPatient.setData('patient_id', '');
                                        setSelectedPatient(null);
                                    }}
                                    selected={selectedPatient}
                                    onSelect={(patient) => {
                                        setSelectedPatient(patient);
                                        assignPatient.setData('patient_id', patient?.id ?? '');
                                    }}
                                    name={assignPatient.data.patient_name}
                                    onNameChange={(value) => assignPatient.setData('patient_name', value)}
                                    phone={assignPatient.data.patient_phone}
                                    onPhoneChange={(value) => assignPatient.setData('patient_phone', value)}
                                    allowDuplicatePhone={assignPatient.data.allow_duplicate_phone}
                                    onAllowDuplicatePhoneChange={(value) => assignPatient.setData('allow_duplicate_phone', value)}
                                    errors={assignPatient.errors}
                                />

                                <Button
                                    type="submit"
                                    disabled={assignPatient.processing}
                                    className="w-full rounded-full bg-[#7d8f7a] px-5 text-sm font-bold text-white hover:bg-[#6f826c]"
                                >
                                    {assignPatient.processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                                    Vincular paciente
                                </Button>
                            </form>
                        )}
                    </section>

                    {/* Duration, value & notes */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="details-heading">
                        <h2 id="details-heading" className="text-lg font-semibold text-[#373432]">
                            Duración, valor y notas
                        </h2>

                        <form onSubmit={handleSaveDetails} className="mt-4 space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="duration" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Duración de la cita
                                </label>

                                <select
                                    id="duration"
                                    value={details.data.duration_minutes}
                                    onChange={(event) => details.setData('duration_minutes', Number(event.target.value))}
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                >
                                    {Array.from(new Set([appointment.duration_minutes, ...durationOptions]))
                                        .sort((a, b) => a - b)
                                        .map((minutes) => (
                                            <option key={minutes} value={minutes}>
                                                {minutes} minutos
                                            </option>
                                        ))}
                                </select>

                                <InputError message={details.errors.duration_minutes} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="service-value" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Valor acordado (COP)
                                </label>

                                <input
                                    id="service-value"
                                    type="text"
                                    inputMode="numeric"
                                    value={details.data.service_value}
                                    onChange={(event) => details.setData('service_value', event.target.value)}
                                    placeholder="100000"
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                {estimatedServiceValue !== null && estimatedServiceValue > 0 && (
                                    <p className="text-xs text-[#706a67]">Se guardará como {formatMoney(estimatedServiceValue)}.</p>
                                )}

                                <InputError message={details.errors.service_value} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="notes" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Notas internas
                                </label>

                                <textarea
                                    id="notes"
                                    rows={4}
                                    value={details.data.notes}
                                    onChange={(event) => details.setData('notes', event.target.value)}
                                    placeholder="Observaciones, motivo de consulta, etc. (solo visibles para ti)"
                                    className="w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 py-2.5 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={details.errors.notes} />
                            </div>

                            <Button
                                type="submit"
                                disabled={details.processing}
                                className="w-full rounded-full bg-[#373432] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4d4744]"
                            >
                                {details.processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                                Guardar cambios
                            </Button>
                        </form>
                    </section>

                    {/* Financial quick view */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="finance-heading">
                        <h2 id="finance-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <Wallet className="size-5 text-[#7d8f7a]" />
                            Resumen financiero
                        </h2>

                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-[#706a67]">Valor acordado</dt>
                                <dd className="font-bold text-[#373432]">{formatMoney(appointment.service_value_cents)}</dd>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-[#706a67]">Total pagado</dt>
                                <dd className="font-bold text-[#6f826c]">{formatMoney(appointment.total_paid_cents)}</dd>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-[#eadedf] pt-2">
                                <dt className="text-[#706a67]">Saldo pendiente</dt>
                                <dd className="font-bold text-[#c98796]">
                                    {appointment.balance_cents === null ? '—' : formatMoney(balance)}
                                </dd>
                            </div>
                        </dl>

                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#706a67]">
                            <ReceiptText className="size-3.5" />
                            {appointment.payments?.length ?? 0} movimiento(s) registrado(s)
                        </p>
                    </section>

                    {/* Cancel */}
                    {appointment.status !== 'cancelled' && appointment.status !== 'attended' && appointment.status !== 'no_show' && (
                        <section className="rounded-2xl border border-[#d99aa8]/30 bg-white p-5 sm:p-6">
                            <h2 className="text-lg font-semibold text-[#373432]">Cancelar cita</h2>

                            <p className="mt-1 text-sm leading-6 text-[#706a67]">
                                Al cancelar, la cita se marca como cancelada y el horario reservado queda liberado. Los pagos existentes se
                                conservan como ingreso.
                            </p>

                            <Button
                                type="button"
                                onClick={handleCancel}
                                className="mt-4 w-full rounded-full border border-[#d99aa8] bg-white px-5 py-2.5 text-sm font-bold text-[#c98796] hover:bg-[#fdeef1]"
                            >
                                <Trash2 className="mr-2 size-4" />
                                Cancelar cita
                            </Button>
                        </section>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
