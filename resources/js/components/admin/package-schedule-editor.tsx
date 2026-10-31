import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { localTodayIso } from '@/lib/appointments';
import { postJson } from '@/lib/http';
import { type PackageSessionInput } from '@/types';
import { CalendarRange, LoaderCircle, PencilLine, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface PackageScheduleEditorProps {
    sessions: PackageSessionInput[];
    sessionsCount: number;
    durationMinutes: number;
    errors: Record<string, string | undefined>;
    onChange: (sessions: PackageSessionInput[]) => void;
}

type ScheduleMode = 'manual' | 'recurring';

const weekdayOptions = [
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' },
];

const frequencyDefaults: Record<number, number[]> = {
    1: [1],
    2: [1, 3],
    3: [1, 3, 5],
};

interface PreviewResponse {
    sessions: PackageSessionInput[];
}

/**
 * Programación de las sesiones de un paquete.
 *
 * Karime puede escribir cada fecha a mano o pedir una propuesta recurrente.
 * La propuesta es solo una ayuda: siempre queda una lista editable y el
 * servidor vuelve a validar jornada, bloqueos y cruces antes de guardar.
 */
export default function PackageScheduleEditor({
    sessions,
    sessionsCount,
    durationMinutes,
    errors,
    onChange,
}: PackageScheduleEditorProps) {
    const [mode, setMode] = useState<ScheduleMode>('manual');
    const [frequency, setFrequency] = useState(2);
    const [startDate, setStartDate] = useState(sessions[0]?.date || localTodayIso());
    const [startTime, setStartTime] = useState(sessions[0]?.start_time || '09:00');
    const [weekdays, setWeekdays] = useState<number[]>(frequencyDefaults[2]);
    const [generating, setGenerating] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const updateSession = (index: number, patch: Partial<Pick<PackageSessionInput, 'date' | 'start_time'>>) => {
        onChange(sessions.map((session, current) => (current === index ? { ...session, ...patch } : session)));
    };

    const changeFrequency = (value: number) => {
        setFrequency(value);
        setWeekdays(frequencyDefaults[value] ?? [1]);
    };

    const toggleWeekday = (value: number) => {
        if (weekdays.includes(value)) {
            if (weekdays.length === 1) {
                return;
            }

            setWeekdays(weekdays.filter((day) => day !== value));

            return;
        }

        if (weekdays.length >= frequency) {
            return;
        }

        setWeekdays([...weekdays, value]);
    };

    const generatePreview = async () => {
        setGenerating(true);
        setPreviewError(null);

        try {
            const json = await postJson<PreviewResponse>(route('admin.packages.preview'), {
                start_date: startDate,
                start_time: startTime,
                sessions_count: sessionsCount,
                weekdays,
            });

            onChange(json.sessions);
        } catch (error) {
            setPreviewError((error as Error).message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <section className="space-y-4 rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4" aria-labelledby="package-schedule-heading">
            <div>
                <h3 id="package-schedule-heading" className="flex items-center gap-2 text-sm font-bold text-[#373432]">
                    <CalendarRange className="size-4 text-[#7d8f7a]" />
                    Programación de las {sessionsCount} sesiones
                </h3>

                <p className="mt-1 text-xs leading-5 text-[#706a67]">
                    Define cada fecha y hora. También puedes generar una propuesta recurrente y luego ajustar las sesiones que necesites.
                </p>
            </div>

            <div className="inline-flex rounded-full border border-[#eadedf] bg-white p-1" role="group" aria-label="Forma de programación">
                <button
                    type="button"
                    onClick={() => setMode('manual')}
                    aria-pressed={mode === 'manual'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        mode === 'manual' ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:text-[#373432]'
                    }`}
                >
                    <PencilLine className="size-3.5" />
                    Manual
                </button>

                <button
                    type="button"
                    onClick={() => setMode('recurring')}
                    aria-pressed={mode === 'recurring'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        mode === 'recurring' ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:text-[#373432]'
                    }`}
                >
                    <Sparkles className="size-3.5" />
                    Recurrente
                </button>
            </div>

            {mode === 'recurring' && (
                <div className="space-y-3 rounded-xl border border-[#eadedf] bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="package-start-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Primera sesión
                            </label>

                            <input
                                id="package-start-date"
                                type="date"
                                value={startDate}
                                min={localTodayIso()}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="package-start-time" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Hora habitual
                            </label>

                            <input
                                id="package-start-time"
                                type="time"
                                value={startTime}
                                onChange={(event) => setStartTime(event.target.value)}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Frecuencia semanal</p>

                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => changeFrequency(value)}
                                    aria-pressed={frequency === value}
                                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                        frequency === value
                                            ? 'border-[#7d8f7a] bg-[#7d8f7a] text-white'
                                            : 'border-[#eadedf] bg-white text-[#706a67] hover:border-[#7d8f7a]'
                                    }`}
                                >
                                    {value}× por semana
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Días de la semana</p>

                        <div className="flex flex-wrap gap-2">
                            {weekdayOptions.map((day) => {
                                const selected = weekdays.includes(day.value);
                                const disabled = !selected && weekdays.length >= frequency;

                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleWeekday(day.value)}
                                        aria-pressed={selected}
                                        disabled={disabled}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                                            selected
                                                ? 'border-[#d99aa8] bg-[#f4e7e8] text-[#a86576]'
                                                : 'border-[#eadedf] bg-white text-[#706a67] hover:border-[#d99aa8]'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={generatePreview}
                        disabled={generating || startTime === '' || weekdays.length === 0}
                        variant="outline"
                        className="rounded-full border-[#7d8f7a] text-sm font-bold text-[#51634e] hover:bg-[#eef2ed]"
                    >
                        {generating ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                        Generar propuesta de fechas
                    </Button>

                    {previewError && <p className="text-xs font-semibold text-[#a14444]">{previewError}</p>}
                </div>
            )}

            <div className="space-y-2">
                <p className="text-xs leading-5 text-[#706a67]">
                    Vista previa editable. Cada sesión dura {durationMinutes} minutos; el servidor verificará que no se cruce con otra cita ni con
                    tus bloqueos.
                </p>

                <ul className="space-y-2">
                    {sessions.map((session, index) => (
                        <li key={index} className="grid gap-2 rounded-xl border border-[#eadedf] bg-white p-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
                            <span className="inline-flex h-8 items-center justify-center rounded-full bg-[#7d8f7a]/12 px-3 text-xs font-bold text-[#51634e] sm:mb-1.5">
                                Sesión {index + 1}
                            </span>

                            <div className="space-y-1">
                                <label htmlFor={`package-session-date-${index}`} className="sr-only">
                                    Fecha de la sesión {index + 1}
                                </label>

                                <input
                                    id={`package-session-date-${index}`}
                                    type="date"
                                    value={session.date}
                                    min={localTodayIso()}
                                    onChange={(event) => updateSession(index, { date: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={errors[`sessions.${index}.date`]} />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor={`package-session-time-${index}`} className="sr-only">
                                    Hora de la sesión {index + 1}
                                </label>

                                <input
                                    id={`package-session-time-${index}`}
                                    type="time"
                                    value={session.start_time}
                                    onChange={(event) => updateSession(index, { start_time: event.target.value })}
                                    className="h-10 w-full rounded-lg border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />

                                <InputError message={errors[`sessions.${index}.start_time`]} />
                            </div>
                        </li>
                    ))}
                </ul>

                <InputError message={errors.sessions} />
            </div>
        </section>
    );
}
