import { Button } from '@/components/ui/button';
import InputError from '@/components/input-error';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/lib/appointments';
import { type AvailabilityBlockItem, type ScheduleDayConfig } from '@/types';
import { useForm } from '@inertiajs/react';
import { Ban, Clock, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface ScheduleProps {
    schedules: ScheduleDayConfig[];
    blocks: AvailabilityBlockItem[];
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes a domingo.

export default function Schedule({ schedules, blocks }: ScheduleProps) {
    const [orderedSchedules] = useState<ScheduleDayConfig[]>(() =>
        DAY_ORDER.map(
            (dayOfWeek) =>
                schedules.find((schedule) => schedule.day_of_week === dayOfWeek) ?? {
                    day_of_week: dayOfWeek,
                    day_name: ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][dayOfWeek],
                    start_time: '08:00',
                    end_time: '18:00',
                    is_active: false,
                },
        ),
    );

    const { data, setData, put, processing, errors } = useForm({
        schedules: orderedSchedules.map((schedule) => ({
            day_of_week: schedule.day_of_week,
            is_active: schedule.is_active,
            start_time: schedule.start_time.slice(0, 5),
            end_time: schedule.end_time.slice(0, 5),
        })),
    });

    const blockForm = useForm({
        date: '',
        start_time: '',
        end_time: '',
        reason: '',
    });

    const [isPartialBlock, setIsPartialBlock] = useState(false);

    const updateDay = (index: number, field: 'is_active' | 'start_time' | 'end_time', value: string | boolean) => {
        setData(
            'schedules',
            data.schedules.map((schedule, position) => (position === index ? { ...schedule, [field]: value } : schedule)),
        );
    };

    const handleSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

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
                        Define tus jornadas de atención. El sistema calculará los espacios disponibles considerando estas horas, las citas
                        confirmadas y tus bloqueos.
                    </p>

                    <form onSubmit={handleSave} className="mt-6">
                        <ul className="space-y-3">
                            {data.schedules.map((schedule, index) => {
                                const dayInfo = orderedSchedules[index];

                                return (
                                    <li
                                        key={schedule.day_of_week}
                                        className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center ${
                                            schedule.is_active ? 'border-[#7d8f7a]/30 bg-[#7d8f7a]/6' : 'border-[#eadedf] bg-[#fcfaf9]'
                                        }`}
                                    >
                                        {/* Active toggle */}
                                        <div className="flex w-40 shrink-0 items-center gap-3">
                                            <input
                                                id={`active-${schedule.day_of_week}`}
                                                type="checkbox"
                                                checked={schedule.is_active}
                                                onChange={(event) => updateDay(index, 'is_active', event.target.checked)}
                                                className="size-4.5 cursor-pointer accent-[#7d8f7a]"
                                            />

                                            <label htmlFor={`active-${schedule.day_of_week}`} className="cursor-pointer text-sm font-bold text-[#373432]">
                                                {dayInfo.day_name}
                                            </label>
                                        </div>

                                        {/* Times */}
                                        <div className="flex flex-1 items-center gap-3">
                                            <div className="flex-1 space-y-1">
                                                <label htmlFor={`start-${schedule.day_of_week}`} className="text-[10px] font-bold tracking-wide text-[#7d8f7a] uppercase">
                                                    Inicio
                                                </label>

                                                <input
                                                    id={`start-${schedule.day_of_week}`}
                                                    type="time"
                                                    value={schedule.start_time}
                                                    disabled={!schedule.is_active}
                                                    onChange={(event) => updateDay(index, 'start_time', event.target.value)}
                                                    className="h-10 w-full rounded-lg border border-[#ded4d4] bg-white px-2.5 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>

                                            <span className="mt-5 text-[#706a67]">–</span>

                                            <div className="flex-1 space-y-1">
                                                <label htmlFor={`end-${schedule.day_of_week}`} className="text-[10px] font-bold tracking-wide text-[#7d8f7a] uppercase">
                                                    Finalización
                                                </label>

                                                <input
                                                    id={`end-${schedule.day_of_week}`}
                                                    type="time"
                                                    value={schedule.end_time}
                                                    disabled={!schedule.is_active}
                                                    onChange={(event) => updateDay(index, 'end_time', event.target.value)}
                                                    className="h-10 w-full rounded-lg border border-[#ded4d4] bg-white px-2.5 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {typeof errors === 'object' && errors !== null && 'schedules' in errors && (
                            <p className="mt-3 text-sm text-red-600">Revisa los horarios: la hora de finalización debe ser posterior a la de inicio.</p>
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
