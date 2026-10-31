import PackageScheduleEditor from '@/components/admin/package-schedule-editor';
import PatientFields from '@/components/admin/patient-fields';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatTime, localTodayIso } from '@/lib/appointments';
import { formatMoney, inputToCents } from '@/lib/money';
import { type PackageSessionInput, type PatientSummary, type ProposedSlot } from '@/types';
import { useForm } from '@inertiajs/react';
import { CalendarPlus, Clock, Layers, LoaderCircle, Plus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface NewAppointmentDialogProps {
    services: string[];
    otherService: string;
}

type PatientMode = 'existing' | 'new';
type AppointmentMode = 'single' | 'package';

interface NewAppointmentForm {
    appointment_mode: AppointmentMode;
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
    sessions_count: number;
    total_value: string;
    sessions: PackageSessionInput[];
    notes: string;
    initial_payment: string;
    initial_payment_on: string;
    initial_payment_method: string;
    initial_payment_idempotency_key: string;
    [key: string]: string | number | boolean | null | undefined | PackageSessionInput[];
}

const durationOptions = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];

const sessionCountOptions = [4, 6, 8, 10];

function emptySessions(count: number): PackageSessionInput[] {
    return Array.from({ length: count }, () => ({ date: '', start_time: '' }));
}

function newKey(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function NewAppointmentDialog({ services, otherService }: NewAppointmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
    const [slots, setSlots] = useState<ProposedSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    const form = useForm<NewAppointmentForm>({
        appointment_mode: 'single',
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
        sessions_count: sessionCountOptions[0],
        total_value: '',
        sessions: emptySessions(sessionCountOptions[0]),
        notes: '',
        initial_payment: '',
        initial_payment_on: localTodayIso(),
        initial_payment_method: '',
        initial_payment_idempotency_key: newKey(),
    });

    const { data, setData, post, processing, errors, reset } = form;
    const isPackage = data.appointment_mode === 'package';

    useEffect(() => {
        if (!open || isPackage) {
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
    }, [open, isPackage, data.date, data.duration_minutes]);

    const resetForm = () => {
        reset();
        setData('initial_payment_on', localTodayIso());
        setData('initial_payment_idempotency_key', newKey());
        setSelectedPatient(null);
        setSlots([]);
        setSlotsError(null);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen) {
            setData('date', localTodayIso());
            setData('start_time', '');
            setData('initial_payment_on', localTodayIso());
            setData('initial_payment_idempotency_key', newKey());
        }
    };

    const changeSessionsCount = (value: number) => {
        const count = Number.isFinite(value) ? Math.max(2, Math.min(52, Math.trunc(value))) : sessionCountOptions[0];
        const sessions = Array.from({ length: count }, (_, index) => data.sessions[index] ?? { date: '', start_time: '' });

        setData({ ...data, sessions_count: count, sessions });
    };

    const sessionsComplete = data.sessions.length === data.sessions_count && data.sessions.every((session) => session.date && session.start_time);

    const buildPayload = () => {
        const common = {
            patient_mode: data.patient_mode,
            patient_id: data.patient_id === '' ? null : data.patient_id,
            patient_name: data.patient_name,
            patient_phone: data.patient_phone,
            patient_allow_duplicate_phone: data.patient_allow_duplicate_phone,
            service: data.service,
            custom_service: data.custom_service,
            duration_minutes: data.duration_minutes,
            notes: data.notes,
        };

        if (data.appointment_mode === 'package') {
            return {
                ...common,
                sessions_count: data.sessions_count,
                total_value: data.total_value,
                sessions: data.sessions.map((session) => ({ date: session.date, start_time: session.start_time })),
                initial_payment: data.initial_payment,
                initial_payment_on: data.initial_payment ? data.initial_payment_on : null,
                initial_payment_method: data.initial_payment ? data.initial_payment_method || null : null,
                initial_payment_idempotency_key: data.initial_payment ? data.initial_payment_idempotency_key : null,
            };
        }

        return {
            ...common,
            date: data.date,
            start_time: data.start_time,
            service_value: data.service_value,
        };
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.transform(() => buildPayload());

        post(isPackage ? route('admin.packages.store') : route('admin.appointments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                resetForm();
            },
        });
    };

    const estimatedValue = inputToCents(isPackage ? data.total_value : data.service_value);
    const estimatedInitialPayment = inputToCents(data.initial_payment);
    const estimatedBalance =
        isPackage && estimatedValue !== null
            ? Math.max(0, estimatedValue - (estimatedInitialPayment !== null && estimatedInitialPayment > 0 ? estimatedInitialPayment : 0))
            : null;

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
                        Registra una cita tomada por teléfono, WhatsApp o en persona. También puedes reservar un paquete completo de sesiones para
                        un mismo paciente.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 inline-flex rounded-full border border-[#eadedf] bg-white p-1" role="group" aria-label="Tipo de registro">
                    <button
                        type="button"
                        onClick={() => setData('appointment_mode', 'single')}
                        aria-pressed={!isPackage}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            !isPackage ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:text-[#373432]'
                        }`}
                    >
                        <CalendarPlus className="size-3.5" />
                        Una sola cita
                    </button>

                    <button
                        type="button"
                        onClick={() => setData('appointment_mode', 'package')}
                        aria-pressed={isPackage}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            isPackage ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:text-[#373432]'
                        }`}
                    >
                        <Layers className="size-3.5" />
                        Paquete de sesiones
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-5">
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
                            <label htmlFor="appointment-duration" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Duración de cada sesión
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

                    {isPackage ? (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label htmlFor="package-sessions-count" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                        Cantidad de sesiones
                                    </label>

                                    <div className="flex flex-wrap gap-2">
                                        {sessionCountOptions.map((count) => (
                                            <button
                                                key={count}
                                                type="button"
                                                onClick={() => changeSessionsCount(count)}
                                                aria-pressed={data.sessions_count === count}
                                                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                                    data.sessions_count === count
                                                        ? 'border-[#7d8f7a] bg-[#7d8f7a] text-white'
                                                        : 'border-[#eadedf] bg-white text-[#706a67] hover:border-[#7d8f7a]'
                                                }`}
                                            >
                                                {count} sesiones
                                            </button>
                                        ))}

                                        <input
                                            id="package-sessions-count"
                                            type="number"
                                            min={2}
                                            max={52}
                                            value={data.sessions_count}
                                            onChange={(event) => changeSessionsCount(Number(event.target.value))}
                                            aria-label="Otra cantidad de sesiones"
                                            className="h-9 w-20 rounded-full border border-[#ded4d4] bg-white px-3 text-center text-xs font-semibold text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                        />
                                    </div>

                                    <InputError message={errors.sessions_count} />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="package-total-value" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                        Valor total del paquete (COP)
                                    </label>

                                    <input
                                        id="package-total-value"
                                        type="text"
                                        inputMode="numeric"
                                        value={data.total_value}
                                        onChange={(event) => setData('total_value', event.target.value)}
                                        placeholder="800000"
                                        className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                    />

                                    {estimatedValue !== null && estimatedValue > 0 && (
                                        <p className="text-xs text-[#706a67]">Se guardará como {formatMoney(estimatedValue)} en total.</p>
                                    )}

                                    <InputError message={errors.total_value} />
                                </div>
                            </div>

                            <PackageScheduleEditor
                                sessions={data.sessions}
                                sessionsCount={data.sessions_count}
                                durationMinutes={data.duration_minutes}
                                errors={errors}
                                onChange={(sessions) => setData('sessions', sessions)}
                            />

                            <fieldset className="space-y-3 rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4">
                                <legend className="px-1 text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Abono inicial (opcional)</legend>

                                <p className="text-xs leading-5 text-[#706a67]">
                                    Si el paciente entrega un abono al reservar, regístralo aquí. Quedará como un pago del paquete, no como un pago por
                                    sesión.
                                </p>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <label htmlFor="package-initial-payment" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                            Importe
                                        </label>

                                        <input
                                            id="package-initial-payment"
                                            type="text"
                                            inputMode="numeric"
                                            value={data.initial_payment}
                                            onChange={(event) => setData('initial_payment', event.target.value)}
                                            placeholder="0"
                                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                        />

                                        <InputError message={errors.initial_payment} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="package-initial-payment-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                            Fecha efectiva
                                        </label>

                                        <input
                                            id="package-initial-payment-date"
                                            type="date"
                                            value={data.initial_payment_on}
                                            max={localTodayIso()}
                                            onChange={(event) => setData('initial_payment_on', event.target.value)}
                                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                        />

                                        <InputError message={errors.initial_payment_on} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="package-initial-payment-method" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                            Método
                                        </label>

                                        <select
                                            id="package-initial-payment-method"
                                            value={data.initial_payment_method}
                                            onChange={(event) => setData('initial_payment_method', event.target.value)}
                                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                        >
                                            <option value="">Sin especificar</option>
                                            <option value="cash">Efectivo</option>
                                            <option value="transfer">Transferencia</option>
                                            <option value="card">Tarjeta</option>
                                            <option value="other">Otro</option>
                                        </select>

                                        <InputError message={errors.initial_payment_method} />
                                    </div>
                                </div>

                                {estimatedInitialPayment !== null && estimatedInitialPayment > 0 && estimatedValue !== null && (
                                    <p className="text-xs text-[#706a67]">
                                        Abono de {formatMoney(estimatedInitialPayment)}. Saldo estimado del paquete: {formatMoney(estimatedBalance ?? 0)}.
                                    </p>
                                )}
                            </fieldset>

                            <div className="space-y-1.5">
                                <label htmlFor="appointment-notes" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Observaciones generales (opcional)
                                </label>

                                <textarea
                                    id="appointment-notes"
                                    rows={3}
                                    value={data.notes}
                                    onChange={(event) => setData('notes', event.target.value)}
                                    placeholder="Acuerdos del paquete, indicaciones generales, etc. Solo visible para ti."
                                    className="w-full rounded-xl border border-[#ded4d4] bg-white px-3 py-2.5 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={errors.notes} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
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
                        </>
                    )}

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
                            disabled={processing || (isPackage ? !sessionsComplete || data.total_value.trim() === '' : data.start_time === '')}
                            className="rounded-full bg-[#7d8f7a] px-6 text-sm font-bold text-white hover:bg-[#6f826c]"
                        >
                            {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                            {isPackage ? 'Crear paquete' : 'Crear cita'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
