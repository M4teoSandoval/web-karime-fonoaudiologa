import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDateTime, formatTime, localTodayIso } from '@/lib/appointments';
import { type AppointmentRequest, type ProposedSlot } from '@/types';
import { useForm } from '@inertiajs/react';
import { CalendarClock, Clock, LoaderCircle } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface RescheduleAppointmentDialogProps {
    appointment: AppointmentRequest;
    triggerLabel?: string;
    triggerClassName?: string;
}

interface RescheduleForm {
    date: string;
    start_time: string;
    duration_minutes: number;
    reason: string;
    [key: string]: string | number;
}

const durationOptions = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

function datePart(value: string | null | undefined): string {
    const date = value ? value.slice(0, 10) : localTodayIso();
    const today = localTodayIso();

    return date < today ? today : date;
}

function timePart(value: string | null | undefined): string {
    return value ? value.slice(11, 16) : '';
}

/**
 * Modal para mover una cita confirmada a un nuevo horario.
 *
 * La disponibilidad mostrada es solo una ayuda visual: el backend vuelve a
 * validar jornada, bloqueos y conflictos dentro de una transacción antes de
 * guardar. La reprogramación no envía mensajes ni notifica al paciente.
 */
export default function RescheduleAppointmentDialog({
    appointment,
    triggerLabel = 'Reprogramar cita',
    triggerClassName = 'rounded-full border-[#7d8f7a] bg-[#7d8f7a] px-5 text-sm font-bold text-white hover:bg-[#6f826c]',
}: RescheduleAppointmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [slots, setSlots] = useState<ProposedSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<RescheduleForm>({
        date: datePart(appointment.confirmed_start),
        start_time: '',
        duration_minutes: appointment.duration_minutes,
        reason: '',
    });

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const controller = new AbortController();

        const load = async () => {
            setLoadingSlots(true);
            setSlotsError(null);

            try {
                const params = new URLSearchParams({
                    date: data.date,
                    duration: String(data.duration_minutes),
                    exclude: String(appointment.id),
                });

                const response = await fetch(`${route('admin.availability.show')}?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('availability failed');
                }

                const json = (await response.json()) as { slots: ProposedSlot[] };
                setSlots(json.slots);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setSlots([]);
                    setSlotsError('No fue posible calcular la disponibilidad. Intenta de nuevo.');
                }
            } finally {
                setLoadingSlots(false);
            }
        };

        void load();

        return () => controller.abort();
    }, [open, data.date, data.duration_minutes, appointment.id]);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            clearErrors();

            const currentDate = datePart(appointment.confirmed_start);
            const confirmedDate = (appointment.confirmed_start ?? '').slice(0, 10);

            setData('date', currentDate);
            setData('start_time', currentDate === confirmedDate ? timePart(appointment.confirmed_start) : '');
            setData('duration_minutes', appointment.duration_minutes);
            setData('reason', '');
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(route('admin.requests.reschedule', appointment.id), {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" className={triggerClassName}>
                    <CalendarClock className="size-4" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-[#eadedf] bg-[#fcf9f7] p-5 text-[#373432] sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#373432]">
                        <CalendarClock className="size-5 text-[#7d8f7a]" />
                        Reprogramar cita
                    </DialogTitle>

                    <DialogDescription className="text-sm leading-6 text-[#706a67]">
                        Mueve la cita de <strong className="font-semibold text-[#373432]">{appointment.patient_name}</strong> a un nuevo horario. El
                        paciente, los pagos, el valor acordado y las notas se conservan.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-[#7d8f7a]/25 bg-[#7d8f7a]/8 p-4">
                    <p className="text-xs font-bold tracking-wide text-[#6f826c] uppercase">Horario actual</p>
                    <p className="mt-1 text-sm font-bold text-[#373432]">{formatDateTime(appointment.confirmed_start)}</p>
                    <p className="mt-0.5 text-xs text-[#706a67]">Duración actual: {appointment.duration_minutes} minutos</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="reschedule-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Nueva fecha
                            </label>

                            <input
                                id="reschedule-date"
                                type="date"
                                value={data.date}
                                min={localTodayIso()}
                                onChange={(event) => {
                                    setData('date', event.target.value);
                                    setData('start_time', '');
                                }}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />

                            <InputError message={errors.date} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="reschedule-duration" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Duración
                            </label>

                            <select
                                id="reschedule-duration"
                                value={data.duration_minutes}
                                onChange={(event) => {
                                    setData('duration_minutes', Number(event.target.value));
                                    setData('start_time', '');
                                }}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
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
                    </div>

                    <div className="space-y-2">
                        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                            <Clock className="size-3.5" />
                            Nueva hora de inicio
                        </p>

                        {loadingSlots ? (
                            <p className="inline-flex items-center gap-2 py-2 text-sm text-[#706a67]">
                                <LoaderCircle className="size-4 animate-spin" />
                                Calculando espacios libres…
                            </p>
                        ) : slotsError ? (
                            <p className="text-sm font-semibold text-[#a14444]">{slotsError}</p>
                        ) : slots.length === 0 ? (
                            <p className="text-sm text-[#706a67]">
                                No hay espacios disponibles ese día con esta duración. Revisa tu jornada, bloqueos o prueba otra fecha.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {slots.map((slot) => {
                                    const time = slot.start.slice(11, 16);
                                    const isSelected = data.start_time === time;

                                    return (
                                        <button
                                            key={slot.start}
                                            type="button"
                                            onClick={() => setData('start_time', time)}
                                            aria-pressed={isSelected}
                                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                                isSelected
                                                    ? 'border-[#7d8f7a] bg-[#7d8f7a] text-white'
                                                    : 'border-[#eadedf] bg-white text-[#373432] hover:border-[#7d8f7a]'
                                            }`}
                                        >
                                            {formatTime(slot.start)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <InputError message={errors.start_time} />
                        <InputError message={errors.status} />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="reschedule-reason" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                            Motivo de la reprogramación (opcional)
                        </label>

                        <textarea
                            id="reschedule-reason"
                            rows={3}
                            value={data.reason}
                            maxLength={500}
                            onChange={(event) => setData('reason', event.target.value)}
                            placeholder="Ej. el paciente tuvo un imprevisto, cambio de disponibilidad, etc."
                            className="w-full rounded-xl border border-[#ded4d4] bg-white px-3 py-2.5 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                        />

                        <InputError message={errors.reason} />
                    </div>

                    <p className="rounded-xl bg-[#f4e7e8]/50 px-4 py-3 text-xs leading-5 text-[#706a67]">
                        Esta acción solo mueve la cita en tu agenda. No envía mensajes ni notifica automáticamente al paciente; después podrás copiar
                        un mensaje de reprogramación desde el detalle de la cita.
                    </p>

                    <div className="flex flex-col-reverse gap-2 border-t border-[#eadedf] pt-4 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="rounded-full border-[#eadedf] text-sm font-semibold text-[#706a67]"
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={processing || data.start_time === ''}
                            className="rounded-full bg-[#7d8f7a] px-6 text-sm font-bold text-white hover:bg-[#6f826c]"
                        >
                            {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                            Guardar nuevo horario
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
