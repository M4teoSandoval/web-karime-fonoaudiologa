import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InputError from '@/components/input-error';
import AdminLayout from '@/layouts/admin-layout';
import { buildProposalWhatsAppUrl, formatDate, formatDateTime, formatTime, statusBadgeClasses, statusLabels } from '@/lib/appointments';
import { type AppointmentRequest, type ProposedSlot } from '@/types';
import { Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CalendarSearch, Check, LoaderCircle, MessageCircle, Save, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface RequestShowProps {
    appointment: AppointmentRequest;
    services: string[];
}

const durationOptions = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

function localTodayIso(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function RequestShow({ appointment }: RequestShowProps) {
    const [date, setDate] = useState<string>(localTodayIso());
    const [slots, setSlots] = useState<ProposedSlot[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const { data, setData, patch, processing, errors } = useForm({
        duration_minutes: appointment.duration_minutes,
        notes: appointment.notes ?? '',
    });

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setLoadingSlots(true);
            setSlotsError(null);

            try {
                const params = new URLSearchParams({
                    date,
                    duration: String(data.duration_minutes),
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
    }, [date, data.duration_minutes, appointment.id]);

    const toggleSlot = (start: string) => {
        setSelected((current) => (current.includes(start) ? current.filter((item) => item !== start) : [...current, start]));
    };

    const handleSaveDetails = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        patch(route('admin.requests.update', appointment.id), { preserveScroll: true });
    };

    const handlePropose = () => {
        if (selected.length === 0) {
            return;
        }

        router.post(
            route('admin.requests.propose', appointment.id),
            { slots: selected },
            { preserveScroll: true },
        );
    };

    const handleConfirm = (start: string) => {
        if (!window.confirm(`¿Confirmar la cita el ${formatDateTime(start)}? El horario quedará reservado definitivamente.`)) {
            return;
        }

        router.post(
            route('admin.requests.confirm', appointment.id),
            { start },
            { preserveScroll: true },
        );
    };

    const handleCancel = () => {
        if (!window.confirm(`¿Cancelar la solicitud de ${appointment.patient_name}? Esta acción libera el horario reservado.`)) {
            return;
        }

        router.post(route('admin.requests.cancel', appointment.id), {}, { preserveScroll: true });
    };

    const proposalUrl = appointment.proposed_slots?.length
        ? buildProposalWhatsAppUrl(appointment.patient_name, appointment.proposed_slots)
        : null;

    const effectiveDuration = data.duration_minutes;

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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl tracking-[-0.03em] text-[#373432] sm:text-4xl">{appointment.patient_name}</h1>

                        <p className="mt-2 text-sm text-[#706a67]">
                            {appointment.service} · Registrada el {formatDate(appointment.created_at)}
                        </p>
                    </div>

                    <Badge variant="secondary" className={`w-fit rounded-full px-3.5 py-1.5 text-xs font-bold ${statusBadgeClasses[appointment.status]}`}>
                        {statusLabels[appointment.status]}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* =================================================
                    MAIN COLUMN
                ================================================= */}
                <div className="space-y-6">
                    {/* Availability */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="availability-heading">
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
                                        disabled={selected.length === 0 || processing}
                                        className="mt-5 rounded-full bg-[#7d8f7a] px-6 text-sm font-bold text-white hover:bg-[#6f826c]"
                                    >
                                        {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                                        Proponer {selected.length > 0 ? `${selected.length} horario(s)` : 'horarios'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Proposed slots */}
                    {appointment.proposed_slots && appointment.proposed_slots.length > 0 && (
                        <section className="rounded-2xl border border-[#7d8f7a]/30 bg-white p-6" aria-labelledby="proposed-heading">
                            <h2 id="proposed-heading" className="text-lg font-semibold text-[#373432]">
                                Horarios propuestos
                            </h2>

                            <p className="mt-1 text-sm text-[#706a67]">
                                Envía las opciones por WhatsApp y, cuando el paciente responda, confirma el horario acordado desde aquí.
                            </p>

                            <ul className="mt-4 space-y-2">
                                {appointment.proposed_slots.map((slot) => {
                                    const isConfirmedSlot =
                                        appointment.status === 'confirmed' && appointment.confirmed_start === slot.start;

                                    return (
                                        <li
                                            key={slot.start}
                                            className="flex flex-col gap-3 rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <span className="text-sm font-semibold text-[#373432]">{formatDateTime(slot.start)}</span>

                                            {isConfirmedSlot ? (
                                                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6f826c]">
                                                    <Check className="size-4" />
                                                    Confirmada
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleConfirm(slot.start)}
                                                    disabled={processing || appointment.status === 'cancelled'}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7d8f7a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6f826c] disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <Check className="size-3.5" />
                                                    Confirmar este horario
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>

                            {proposalUrl && appointment.status !== 'cancelled' && (
                                <div className="mt-5 rounded-xl bg-[#f4e7e8]/60 p-4">
                                    <p className="text-xs font-bold tracking-wide text-[#c98796] uppercase">Mensaje para el paciente</p>

                                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#373432]">
                                        {`Hola, tengo disponibles las siguientes opciones para tu cita:\n\n${appointment.proposed_slots
                                            .map((slot) => `- ${formatDateTime(slot.start)}`)
                                            .join('\n')}\n\n¿Cuál te queda mejor? Muchas gracias.`}
                                    </p>

                                    <a
                                        href={proposalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
                                    >
                                        <MessageCircle className="size-4" />
                                        Enviar por WhatsApp
                                    </a>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Confirmed appointment */}
                    {appointment.status === 'confirmed' && appointment.confirmed_start && (
                        <section className="rounded-2xl border border-[#7d8f7a] bg-[#7d8f7a]/8 p-6" aria-labelledby="confirmed-heading">
                            <h2 id="confirmed-heading" className="text-lg font-semibold text-[#373432]">
                                Cita confirmada
                            </h2>

                            <p className="mt-2 text-base font-bold text-[#51634e]">{formatDateTime(appointment.confirmed_start)}</p>

                            <p className="mt-1 text-sm text-[#706a67]">
                                Duración: {appointment.duration_minutes} minutos. El horario está reservado en tu agenda.
                            </p>
                        </section>
                    )}
                </div>

                {/* =================================================
                    SIDEBAR
                ================================================= */}
                <div className="space-y-6">
                    {/* Duration & notes */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="details-heading">
                        <h2 id="details-heading" className="text-lg font-semibold text-[#373432]">
                            Duración y notas
                        </h2>

                        <form onSubmit={handleSaveDetails} className="mt-4 space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="duration" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Duración de la cita
                                </label>

                                <select
                                    id="duration"
                                    value={data.duration_minutes}
                                    onChange={(event) => setData('duration_minutes', Number(event.target.value))}
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

                                <InputError message={errors.duration_minutes} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="notes" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Notas internas
                                </label>

                                <textarea
                                    id="notes"
                                    rows={4}
                                    value={data.notes}
                                    onChange={(event) => setData('notes', event.target.value)}
                                    placeholder="Observaciones, motivo de consulta, etc. (solo visibles para ti)"
                                    className="w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 py-2.5 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={errors.notes} />
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-full bg-[#373432] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4d4744]"
                            >
                                {processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                                Guardar cambios
                            </Button>
                        </form>
                    </section>

                    {/* Cancel */}
                    {appointment.status !== 'cancelled' && (
                        <section className="rounded-2xl border border-[#d99aa8]/30 bg-white p-6">
                            <h2 className="text-lg font-semibold text-[#373432]">Cancelar solicitud</h2>

                            <p className="mt-1 text-sm leading-6 text-[#706a67]">
                                Al cancelar, la solicitud se marca como cancelada y cualquier horario reservado queda liberado.
                            </p>

                            <Button
                                type="button"
                                onClick={handleCancel}
                                disabled={processing}
                                className="mt-4 w-full rounded-full border border-[#d99aa8] bg-white px-5 py-2.5 text-sm font-bold text-[#c98796] hover:bg-[#fdeef1]"
                            >
                                <Trash2 className="mr-2 size-4" />
                                Cancelar solicitud
                            </Button>
                        </section>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
