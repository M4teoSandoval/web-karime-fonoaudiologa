import AdminLayout from '@/layouts/admin-layout';
import { type AgendaDay } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Ban, CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';

interface AgendaProps {
    weekStart: string;
    previousWeekStart: string;
    nextWeekStart: string;
    days: AgendaDay[];
}

export default function Agenda({ weekStart, previousWeekStart, nextWeekStart, days }: AgendaProps) {
    const navigateToWeek = (start: string) => {
        router.get('/admin/agenda', { start }, { preserveState: true, preserveScroll: true });
    };

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <AdminLayout title="Agenda">
            {/* Week navigation */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => navigateToWeek(previousWeekStart)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8]"
                >
                    <ChevronLeft className="size-4" />
                    Semana anterior
                </button>

                <p className="text-sm font-bold text-[#373432]">
                    Semana del {weekStart.split('-').reverse().join('/')}
                </p>

                <button
                    type="button"
                    onClick={() => navigateToWeek(nextWeekStart)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8]"
                >
                    Semana siguiente
                    <ChevronRight className="size-4" />
                </button>
            </div>

            {/* Days */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {days.map((day) => {
                    const isToday = day.date === todayIso;

                    return (
                        <section
                            key={day.date}
                            aria-label={`${day.day_name} ${day.date}`}
                            className={`rounded-2xl border bg-white p-5 ${isToday ? 'border-[#7d8f7a] shadow-[0_12px_30px_rgba(125,143,122,0.12)]' : 'border-[#eadedf]'}`}
                        >
                            {/* Day header */}
                            <div className="flex items-baseline justify-between border-b border-[#eadedf] pb-3">
                                <p className="text-sm font-bold tracking-wide text-[#373432] capitalize">{day.day_name}</p>

                                <span className="text-2xl font-semibold text-[#d99aa8]">{day.day_number}</span>
                            </div>

                            {/* Schedule */}
                            {day.schedule ? (
                                <p className="mt-3 text-xs font-semibold text-[#7d8f7a]">
                                    Jornada: {day.schedule.start_time.slice(0, 5)} – {day.schedule.end_time.slice(0, 5)}
                                </p>
                            ) : (
                                <p className="mt-3 text-xs font-semibold text-[#706a67]">Sin jornada configurada</p>
                            )}

                            {/* Blocks */}
                            {day.blocks.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {day.blocks.map((block) => (
                                        <li key={block.id} className="flex items-start gap-2 rounded-lg bg-[#fdeef1] px-3 py-2 text-xs text-[#c98796]">
                                            <Ban className="mt-0.5 size-3.5 shrink-0" />

                                            <span>
                                                {block.is_full_day ? 'Día completo bloqueado' : `Bloqueado ${block.start_time?.slice(0, 5)}–${block.end_time?.slice(0, 5)}`}
                                                {block.reason ? ` · ${block.reason}` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Appointments */}
                            {day.appointments.length === 0 ? (
                                <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#706a67]">
                                    <CalendarX className="size-3.5" />
                                    Sin citas confirmadas
                                </p>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {day.appointments.map((appointment) => (
                                        <li key={appointment.id}>
                                            <Link
                                                href={`/admin/solicitudes/${appointment.id}`}
                                                className="block rounded-xl border border-[#7d8f7a]/25 bg-[#7d8f7a]/8 px-3.5 py-3 transition-colors hover:bg-[#7d8f7a]/15"
                                            >
                                                <p className="text-sm font-bold text-[#51634e]">
                                                    {appointment.start} – {appointment.end}
                                                </p>

                                                <p className="mt-0.5 truncate text-sm font-semibold text-[#373432]">{appointment.patient_name}</p>

                                                <p className="mt-0.5 truncate text-xs text-[#706a67]">
                                                    {appointment.service} · {appointment.duration_minutes} min
                                                </p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
        </AdminLayout>
    );
}
