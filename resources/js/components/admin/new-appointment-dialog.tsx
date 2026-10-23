import PatientFields from '@/components/admin/patient-fields';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatTime, localTodayIso } from '@/lib/appointments';
import { formatMoney, inputToCents } from '@/lib/money';
import { type PatientSummary, type ProposedSlot } from '@/types';
import { useForm } from '@inertiajs/react';
import { CalendarPlus, Clock, LoaderCircle, Plus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface NewAppointmentDialogProps {
    services: string[];
    otherService: string;
}

type PatientMode = 'existing' | 'new';

interface NewAppointmentForm {
    patient_mode: PatientMode;
    patient_id: number | '';
    patient_name: string;
    patient_phone: string;
    patient_allow_duplicate_phone: boolean;
    service: string;
    custom_service: string;
    date: string;
    start_time: string;
    duration_minutes: number;
    service_value: string;
    notes: string;
    [key: string]: string | number | boolean | null | undefined;
}

const durationOptions = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

export default function NewAppointmentDialog({ services, otherService }: NewAppointmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
    const [slots, setSlots] = useState<ProposedSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm<NewAppointmentForm>({
        patient_mode: 'existing',
        patient_id: '',
        patient_name: '',
        patient_phone: '',
        patient_allow_duplicate_phone: false,
        service: services[0] ?? '',
        custom_service: '',
        date: localTodayIso(),
        start_time: '',
        duration_minutes: 60,
        service_value: '',
        notes: '',
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
    }, [open, data.date, data.duration_minutes]);

    const resetForm = () => {
        reset();
        setSelectedPatient(null);
        setSlots([]);
        setSlotsError(null);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setData('date', localTodayIso());
            setData('start_time', '');
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(route('admin.appointments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                resetForm();
            },
        });
    };

    const estimatedValue = inputToCents(data.service_value);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className="rounded-full bg-[#7d8f7a] px-5 text-sm font-bold text-white hover:bg-[#6f826c]">
                    <Plus className="mr-2 size-4" />
                    Nueva cita
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-[#eadedf] bg-[#fcf9f7] p-5 text-[#373432] sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#373432]">
                        <CalendarPlus className="size-5 text-[#7d8f7a]" />
                        Nueva cita
                    </DialogTitle>

                    <DialogDescription className="text-sm leading-6 text-[#706a67]">
                        Registra una cita tomada por teléfono, WhatsApp o en persona. Quedará confirmada y reservará el horario en tu
                        agenda.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-2 space-y-5">
                    <PatientFields
                        mode={data.patient_mode}
                        onModeChange={(mode) => {
                            setData('patient_mode', mode);
                            setData('patient_id', '');
                            setSelectedPatient(null);
                        }}
                        selected={selectedPatient}
                        onSelect={(patient) => {
                            setSelectedPatient(patient);
                            setData('patient_id', patient?.id ?? '');
                        }}
                        name={data.patient_name}
                        onNameChange={(value) => setData('patient_name', value)}
                        phone={data.patient_phone}
                        onPhoneChange={(value) => setData('patient_phone', value)}
                        allowDuplicatePhone={data.patient_allow_duplicate_phone}
                        onAllowDuplicatePhoneChange={(value) => setData('patient_allow_duplicate_phone', value)}
                        errors={errors}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="appointment-service" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Servicio
                            </label>

                            <select
                                id="appointment-service"
                                value={data.service}
                                onChange={(event) => setData('service', event.target.value)}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            >
                                {services.map((service) => (
                                    <option key={service} value={service}>
                                        {service}
                                    </option>
                                ))}

                                <option value={otherService}>{otherService}</option>
                            </select>

                            <InputError message={errors.service} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="appointment-value" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Valor acordado (COP)
                            </label>

                            <input
                                id="appointment-value"
                                type="text"
                                inputMode="numeric"
                                value={data.service_value}
                                onChange={(event) => setData('service_value', event.target.value)}
                                placeholder="100000"
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />

                            {estimatedValue !== null && estimatedValue > 0 && (
                                <p className="text-xs text-[#706a67]">Se guardará como {formatMoney(estimatedValue)}.</p>
                            )}

                            <InputError message={errors.service_value} />
                        </div>

                        {data.service === otherService && (
                            <div className="space-y-1.5 sm:col-span-2">
                                <label htmlFor="custom-service" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    ¿Qué servicio se va a prestar?
                                </label>

                                <input
                                    id="custom-service"
                                    type="text"
                                    value={data.custom_service}
                                    onChange={(event) => setData('custom_service', event.target.value)}
                                    placeholder="Escribe el nombre del servicio"
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={errors.custom_service} />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="appointment-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Fecha
                            </label>

                            <input
                                id="appointment-date"
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
                            <label htmlFor="appointment-duration" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Duración
                            </label>

                            <select
                                id="appointment-duration"
                                value={data.duration_minutes}
                                onChange={(event) => {
                                    setData('duration_minutes', Number(event.target.value));
                                    setData('start_time', '');
                                }}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            >
                                {durationOptions.map((minutes) => (
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
                            Hora de inicio
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
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="appointment-notes" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                            Observaciones (opcional)
                        </label>

                        <textarea
                            id="appointment-notes"
                            rows={3}
                            value={data.notes}
                            onChange={(event) => setData('notes', event.target.value)}
                            placeholder="Motivo de consulta, indicaciones, etc. Solo visible para ti."
                            className="w-full rounded-xl border border-[#ded4d4] bg-white px-3 py-2.5 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                        />

                        <InputError message={errors.notes} />
                    </div>

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
                            Crear cita
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
