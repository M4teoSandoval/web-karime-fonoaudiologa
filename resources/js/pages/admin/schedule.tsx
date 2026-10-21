import { Button } from '@/components/ui/button';
import InputError from '@/components/input-error';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/lib/appointments';
import { type AvailabilityBlockItem, type ScheduleDayConfig } from '@/types';
import { useForm } from '@inertiajs/react';
import { Ban, Clock, Copy, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface ScheduleProps {
    schedules: ScheduleDayConfig[];
    blocks: AvailabilityBlockItem[];
}

// Se usan type aliases (no interfaces) para que sean compatibles con FormDataConvertible de Inertia.
type IntervalDraft = {
    start_time: string;
    end_time: string;
};

type ScheduleDraft = {
    day_of_week: number;
    day_name: string;
    is_active: boolean;
    intervals: IntervalDraft[];
};

type ScheduleFormDay = {
    day_of_week: number;
    is_active: boolean;
    intervals: IntervalDraft[];
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes a domingo.
const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** HH:MM -> minutos desde medianoche. */
const toMinutes = (time: string): number => {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/** Validación en cliente: inicio < fin y sin traslapes dentro de un día. */
const intervalsOverlap = (intervals: IntervalDraft[]): boolean => {
    const sorted = [...intervals].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

    for (let index = 1; index < sorted.length; index += 1) {
        if (toMinutes(sorted[index].start_time) < toMinutes(sorted[index - 1].end_time)) {
            return true;
        }
    }

    return false;
};

const describeIntervals = (intervals: IntervalDraft[]): string =>
    intervals.map((interval) => `${interval.start_time.slice(0, 5)}–${interval.end_time.slice(0, 5)}`).join(', ');

const sameIntervals = (a: IntervalDraft[], b: IntervalDraft[]): boolean => {
    const normalize = (intervals: IntervalDraft[]) =>
        [...intervals]
            .sort((x, y) => toMinutes(x.start_time) - toMinutes(y.start_time))
            .map((interval) => `${interval.start_time.slice(0, 5)}-${interval.end_time.slice(0, 5)}`)
            .join('|');

    return normalize(a) === normalize(b);
};

const defaultDraft = (): ScheduleDraft[] =>
    DAY_ORDER.map((dayOfWeek) => ({
        day_of_week: dayOfWeek,
        day_name: DAY_NAMES[dayOfWeek],
        is_active: false,
        intervals: [{ start_time: '08:00', end_time: '18:00' }],
    }));

export default function Schedule({ schedules, blocks }: ScheduleProps) {
    const [draft] = useState<ScheduleDraft[]>(() => {
        const draft = defaultDraft();

        schedules.forEach((schedule) => {
            const position = draft.findIndex((day) => day.day_of_week === schedule.day_of_week);

            if (position === -1) {
                return;
            }

            const intervals =
                schedule.intervals.length > 0
                    ? schedule.intervals.map((interval) => ({
                          start_time: interval.start_time.slice(0, 5),
                          end_time: interval.end_time.slice(0, 5),
                      }))
                    : [{ start_time: '08:00', end_time: '18:00' }];

            draft[position] = {
                day_of_week: schedule.day_of_week,
                day_name: schedule.day_name,
                is_active: schedule.is_active,
                intervals,
            };
        });

        return draft;
    });

    const { data, setData, put, processing, errors } = useForm<{ schedules: ScheduleFormDay[] }>({
        schedules: draft.map((day) => ({
            day_of_week: day.day_of_week,
            is_active: day.is_active,
            intervals: day.intervals,
        })),
    });

    const [dayErrors, setDayErrors] = useState<Record<number, string>>({});
    const [copySource, setCopySource] = useState<number | null>(null);

    const blockForm = useForm({
        date: '',
        start_time: '',
        end_time: '',
        reason: '',
    });

    const [isPartialBlock, setIsPartialBlock] = useState(false);

    const setDay = (index: number, update: Partial<ScheduleDraft>) => {
        setData(
            'schedules',
            data.schedules.map((schedule, position) => (position === index ? { ...schedule, ...update } : schedule)),
        );
    };

    const setIntervalValue = (dayIndex: number, intervalIndex: number, field: keyof IntervalDraft, value: string) => {
        setData(
            'schedules',
            data.schedules.map((schedule, position) =>
                position === dayIndex
                    ? {
                          ...schedule,
                          intervals: schedule.intervals.map((interval, slot) =>
                              slot === intervalIndex ? { ...interval, [field]: value } : interval,
                          ),
                      }
                    : schedule,
            ),
        );
    };

    const addInterval = (dayIndex: number) => {
        const day = data.schedules[dayIndex];
        const last = day.intervals[day.intervals.length - 1];

        // Sugerencia: comenzar media hora después del fin del último bloque.
        const suggestedStart = last ? formatMinutes(toMinutes(last.end_time) + 30) : '14:00';
        const suggestedEnd = last ? formatMinutes(toMinutes(last.end_time) + 150) : '18:00';

        setDay(dayIndex, { is_active: true, intervals: [...day.intervals, { start_time: suggestedStart, end_time: suggestedEnd }] });
    };

    const removeInterval = (dayIndex: number, intervalIndex: number) => {
        const day = data.schedules[dayIndex];

        setDay(dayIndex, { intervals: day.intervals.filter((_, slot) => slot !== intervalIndex) });
    };

    /** Copia la configuración de un día a otros días seleccionados (solo en pantalla, sin guardar). */
    const applyToDays = (sourceIndex: number, targets: number[]) => {
        const source = data.schedules[sourceIndex];

        if (targets.length === 0) {
            return;
        }

        const hasDifferentConfig = targets.some((targetIndex) => {
            const target = data.schedules[targetIndex];
            return target.is_active !== source.is_active || !sameIntervals(target.intervals, source.intervals);
        });

        if (
            hasDifferentConfig &&
            !window.confirm(
                `Algunos de los días seleccionados tienen una configuración diferente y será sobrescrita con la de ${draft[sourceIndex].day_name} (${describeIntervals(source.intervals)}). ¿Continuar?`,
            )
        ) {
            return;
        }

        setData(
            'schedules',
            data.schedules.map((schedule, position) =>
                targets.includes(position)
                    ? { ...schedule, is_active: source.is_active, intervals: source.intervals.map((interval) => ({ ...interval })) }
                    : schedule,
            ),
        );
    };

    const handleSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Validación en cliente antes de enviar.
        const errors: Record<number, string> = {};

        data.schedules.forEach((schedule, index) => {
            if (!schedule.is_active) {
                return;
            }

            if (schedule.intervals.length === 0) {
                errors[index] = 'Agrega al menos un horario para este día.';
                return;
            }

            const invalid = schedule.intervals.some((interval) => toMinutes(interval.end_time) <= toMinutes(interval.start_time));

            if (invalid) {
                errors[index] = 'La hora de finalización debe ser posterior a la de inicio.';
                return;
            }

            if (intervalsOverlap(schedule.intervals)) {
                errors[index] = 'Los horarios no pueden traslaparse. Ajusta las franjas para que no se solapen.';
            }
        });

        setDayErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        put(route('admin.schedule.update'), { preserveScroll: true });
    };

    const handleBlock = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        blockForm.post(route('admin.blocks.store'), {
            preserveScroll: true,
            onSuccess: () => {
                blockForm.reset();
                setIsPartialBlock(false);
            },
        });
    };

    const handleDeleteBlock = (id: number) => {
        if (!window.confirm('¿Eliminar este bloqueo? El horario volverá a estar disponible.')) {
            return;
        }

        blockForm.delete(route('admin.blocks.destroy', id), { preserveScroll: true });
    };

    return (
        <AdminLayout title="Horarios de atención">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* =================================================
                    WEEKLY SCHEDULE
                ================================================= */}
                <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="weekly-heading">
                    <div className="flex items-center gap-3">
                        <Clock className="size-5 text-[#7d8f7a]" />

                        <h2 id="weekly-heading" className="text-lg font-semibold text-[#373432]">
                            Días y horas habituales
                        </h2>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-[#706a67]">
                        Define tus jornadas de atención. Puedes agregar varios bloques por día (por ejemplo, mañana y tarde); el sistema no
                        ofrecerá citas durante las pausas entre bloques.
                    </p>

                    <form onSubmit={handleSave} className="mt-6">
                        <ul className="space-y-3">
                            {data.schedules.map((schedule, index) => {
                                const dayInfo = draft[index];

                                return (
                                    <li
                                        key={schedule.day_of_week}
                                        className={`rounded-xl border p-4 transition-colors ${
                                            schedule.is_active ? 'border-[#7d8f7a]/30 bg-[#7d8f7a]/6' : 'border-[#eadedf] bg-[#fcfaf9]'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                            {/* Active toggle */}
                                            <div className="flex w-40 shrink-0 items-center gap-3 pt-1">
                                                <input
                                                    id={`active-${schedule.day_of_week}`}
                                                    type="checkbox"
                                                    checked={schedule.is_active}
                                                    onChange={(event) => setDay(index, { is_active: event.target.checked })}
                                                    className="size-4.5 cursor-pointer accent-[#7d8f7a]"
                                                />

                                                <label
                                                    htmlFor={`active-${schedule.day_of_week}`}
                                                    className="cursor-pointer text-sm font-bold text-[#373432]"
                                                >
                                                    {dayInfo.day_name}
                                                </label>
                                            </div>

                                            {/* Intervals */}
                                            <div className="flex-1 space-y-3">
                                                {schedule.intervals.map((interval, intervalIndex) => (
                                                    <div key={`${schedule.day_of_week}-${intervalIndex}`} className="flex items-end gap-3">
                                                        <div className="flex flex-1 items-end gap-3">
                                                            <div className="flex-1 space-y-1">
                                                                <label
                                                                    htmlFor={`start-${schedule.day_of_week}-${intervalIndex}`}
                                                                    className="text-[10px] font-bold tracking-wide text-[#7d8f7a] uppercase"
                                                                >
                                                                    Inicio
                                                                </label>

                                                                <input
                                                                    id={`start-${schedule.day_of_week}-${intervalIndex}`}
                                                                    type="time"
                                                                    value={interval.start_time}
                                                                    disabled={!schedule.is_active}
                                                                    onChange={(event) =>
                                                                        setIntervalValue(index, intervalIndex, 'start_time', event.target.value)
                                                                    }
                                                                    className="h-10 w-full rounded-lg border border-[#ded4d4] bg-white px-2.5 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>

                                                            <span className="pb-2.5 text-[#706a67]">–</span>

                                                            <div className="flex-1 space-y-1">
                                                                <label
                                                                    htmlFor={`end-${schedule.day_of_week}-${intervalIndex}`}
                                                                    className="text-[10px] font-bold tracking-wide text-[#7d8f7a] uppercase"
                                                                >
                                                                    Finalización
                                                                </label>

                                                                <input
                                                                    id={`end-${schedule.day_of_week}-${intervalIndex}`}
                                                                    type="time"
                                                                    value={interval.end_time}
                                                                    disabled={!schedule.is_active}
                                                                    onChange={(event) =>
                                                                        setIntervalValue(index, intervalIndex, 'end_time', event.target.value)
                                                                    }
                                                                    className="h-10 w-full rounded-lg border border-[#ded4d4] bg-white px-2.5 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>
                                                        </div>

                                                        {schedule.intervals.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeInterval(index, intervalIndex)}
                                                                aria-label={`Eliminar horario de ${dayInfo.day_name}`}
                                                                className="mb-1 shrink-0 rounded-full p-2 text-[#706a67] transition-colors hover:bg-[#fdeef1] hover:text-[#c98796]"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => addInterval(index)}
                                                        disabled={!schedule.is_active}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-[#7d8f7a]/40 px-3 py-1.5 text-xs font-bold text-[#7d8f7a] transition-colors hover:bg-[#7d8f7a]/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Plus className="size-3.5" />
                                                        Agregar horario
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setCopySource(copySource === index ? null : index)}
                                                        disabled={!schedule.is_active}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-[#ded4d4] px-3 py-1.5 text-xs font-bold text-[#706a67] transition-colors hover:bg-[#fcfaf9] disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Copy className="size-3.5" />
                                                        {copySource === index ? 'Selecciona los días de destino' : 'Aplicar a otros días'}
                                                    </button>
                                                </div>

                                                {copySource === index && (
                                                    <CopyTargets
                                                        days={draft}
                                                        sourceIndex={index}
                                                        onApply={(targets) => {
                                                            applyToDays(index, targets);
                                                            setCopySource(null);
                                                        }}
                                                        onCancel={() => setCopySource(null)}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {dayErrors[index] && <p className="mt-2 text-sm text-red-600 sm:pl-44">{dayErrors[index]}</p>}
                                    </li>
                                );
                            })}
                        </ul>

                        {typeof errors === 'object' && errors !== null && 'schedules' in errors && typeof errors.schedules === 'string' && (
                            <p className="mt-3 text-sm text-red-600">{errors.schedules}</p>
                        )}

                        <Button
                            type="submit"
                            disabled={processing}
                            className="mt-6 rounded-full bg-[#7d8f7a] px-6 text-sm font-bold text-white hover:bg-[#6f826c]"
                        >
                            {processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                            Guardar horarios
                        </Button>
                    </form>
                </section>

                {/* =================================================
                    BLOCKS
                ================================================= */}
                <div className="space-y-6">
                    {/* New block */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="block-heading">
                        <div className="flex items-center gap-3">
                            <Ban className="size-5 text-[#d99aa8]" />

                            <h2 id="block-heading" className="text-lg font-semibold text-[#373432]">
                                Bloquear disponibilidad
                            </h2>
                        </div>

                        <p className="mt-1 text-sm leading-6 text-[#706a67]">
                            Bloquea un día completo o una franja horaria por motivos personales.
                        </p>

                        <form onSubmit={handleBlock} className="mt-5 space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="block-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Fecha
                                </label>

                                <input
                                    id="block-date"
                                    type="date"
                                    required
                                    value={blockForm.data.date}
                                    onChange={(event) => blockForm.setData('date', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={blockForm.errors.date} />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    id="partial-block"
                                    type="checkbox"
                                    checked={isPartialBlock}
                                    onChange={(event) => setIsPartialBlock(event.target.checked)}
                                    className="size-4.5 cursor-pointer accent-[#d99aa8]"
                                />

                                <label htmlFor="partial-block" className="cursor-pointer text-sm font-semibold text-[#373432]">
                                    Solo una franja horaria
                                </label>
                            </div>

                            {isPartialBlock && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label htmlFor="block-start" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                            Desde
                                        </label>

                                        <input
                                            id="block-start"
                                            type="time"
                                            required
                                            value={blockForm.data.start_time}
                                            onChange={(event) => blockForm.setData('start_time', event.target.value)}
                                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                        />

                                        <InputError message={blockForm.errors.start_time} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="block-end" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                            Hasta
                                        </label>

                                        <input
                                            id="block-end"
                                            type="time"
                                            required
                                            value={blockForm.data.end_time}
                                            onChange={(event) => blockForm.setData('end_time', event.target.value)}
                                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                        />

                                        <InputError message={blockForm.errors.end_time} />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="block-reason" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                    Motivo (opcional)
                                </label>

                                <input
                                    id="block-reason"
                                    type="text"
                                    maxLength={160}
                                    placeholder="Ej. Citas personales"
                                    value={blockForm.data.reason}
                                    onChange={(event) => blockForm.setData('reason', event.target.value)}
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={blockForm.processing}
                                className="w-full rounded-full bg-[#d99aa8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#c98796]"
                            >
                                {blockForm.processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                                Crear bloqueo
                            </Button>
                        </form>
                    </section>

                    {/* Existing blocks */}
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="blocks-list-heading">
                        <h2 id="blocks-list-heading" className="text-lg font-semibold text-[#373432]">
                            Próximos bloqueos
                        </h2>

                        {blocks.length === 0 ? (
                            <p className="mt-3 text-sm text-[#706a67]">No tienes bloqueos programados.</p>
                        ) : (
                            <ul className="mt-4 space-y-2">
                                {blocks.map((block) => (
                                    <li key={block.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eadedf] bg-[#fcfaf9] px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#373432]">{formatDate(block.date)}</p>

                                            <p className="mt-0.5 truncate text-xs text-[#706a67]">
                                                {block.is_full_day
                                                    ? 'Día completo'
                                                    : `De ${block.start_time?.slice(0, 5)} a ${block.end_time?.slice(0, 5)}`}
                                                {block.reason ? ` · ${block.reason}` : ''}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteBlock(block.id)}
                                            aria-label="Eliminar bloqueo"
                                            className="shrink-0 rounded-full p-2 text-[#706a67] transition-colors hover:bg-[#fdeef1] hover:text-[#c98796]"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}

function formatMinutes(total: number): string {
    const clamped = Math.min(Math.max(total, 0), 23 * 60 + 59);
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Panel para elegir a qué días copiar la configuración del día origen. */
function CopyTargets({
    days,
    sourceIndex,
    onApply,
    onCancel,
}: {
    days: { day_of_week: number; day_name: string }[];
    sourceIndex: number;
    onApply: (targets: number[]) => void;
    onCancel: () => void;
}) {
    const [selected, setSelected] = useState<number[]>([]);

    const toggle = (index: number) => {
        setSelected((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
    };

    return (
        <fieldset className="rounded-xl border border-[#ded4d4] bg-white p-3">
            <legend className="px-1 text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Días de destino</legend>

            <div className="flex flex-wrap gap-2">
                {days.map((day, index) =>
                    index === sourceIndex ? null : (
                        <label key={day.day_of_week} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#373432]">
                            <input
                                type="checkbox"
                                checked={selected.includes(index)}
                                onChange={() => toggle(index)}
                                className="size-4 accent-[#7d8f7a]"
                            />
                            {day.day_name}
                        </label>
                    ),
                )}
            </div>

            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={() => onApply(selected)}
                    disabled={selected.length === 0}
                    className="rounded-full bg-[#7d8f7a] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#6f826c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Aplicar configuración
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full border border-[#ded4d4] px-4 py-1.5 text-xs font-bold text-[#706a67] transition-colors hover:bg-[#fcfaf9]"
                >
                    Cancelar
                </button>
            </div>
        </fieldset>
    );
}
