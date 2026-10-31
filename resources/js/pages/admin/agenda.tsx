import NewAppointmentDialog from '@/components/admin/new-appointment-dialog';
import PackageProgressBadge from '@/components/admin/package-progress-badge';
import RescheduleAppointmentDialog from '@/components/admin/reschedule-appointment-dialog';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/layouts/admin-layout';
import { paymentStatusBadgeClasses, paymentStatusLabels, statusBadgeClasses, statusLabels } from '@/lib/appointments';
import { formatMoney } from '@/lib/money';
import { type AgendaDay } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Ban, CalendarDays, CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';

interface AgendaProps {
    weekStart: string;
    previousWeekStart: string;
    nextWeekStart: string;
    days: AgendaDay[];
    services: string[];
    otherService: string;
}

export default function Agenda({ weekStart, previousWeekStart, nextWeekStart, days, services, otherService }: AgendaProps) {
    const navigateToWeek = (start: string) => {
        router.get('/admin/agenda', { start }, { preserveState: true, preserveScroll: true });
    };

    // "Hoy" según la zona horaria del navegador; el backend calcula la semana con America/Bogota.
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isCurrentWeek = weekStart <= todayIso && todayIso < nextWeekStart;

    return (
        <AdminLayout title="Agenda">
            {/* Week navigation */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigateToWeek(previousWeekStart)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8]"
                    >
                        <ChevronLeft className="size-4" />
                        <span className="sm:hidden">Anterior</span>
                        <span className="hidden sm:inline">Semana anterior</span>
                    </button>

                    {!isCurrentWeek && (
                        <button
                            type="button"
                            onClick={() => router.get('/admin/agenda', {}, { preserveState: true, preserveScroll: true })}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#7d8f7a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f826c]"
                        >
                            <CalendarDays className="size-4" />
                            Volver a hoy
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => navigateToWeek(nextWeekStart)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8]"
                    >
                        <span className="sm:hidden">Siguiente</span>
                        <span className="hidden sm:inline">Semana siguiente</span>
                        <ChevronRight className="size-4" />
                    </button>
                </div>

                <p className="text-sm font-bold text-[#373432]">Semana del {weekStart.split('-').reverse().join('/')}</p>

                <NewAppointmentDialog services={services} otherService={otherService} />
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
                            {day.intervals.length > 0 ? (
                                <ul className="mt-3 space-y-1">
                                    {day.intervals.map((interval) => (
                                        <li key={`${interval.start_time}-${interval.end_time}`} className="text-xs font-semibold text-[#7d8f7a]">
                                            Jornada: {interval.start_time.slice(0, 5)} – {interval.end_time.slice(0, 5)}
                                        </li>
                                    ))}
                                </ul>
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
                                        <li key={appointment.id} className="space-y-2">
                                            <Link
                                                href={`/admin/solicitudes/${appointment.id}`}
                                                className="block rounded-xl border border-[#7d8f7a]/25 bg-[#7d8f7a]/8 px-3.5 py-3 transition-colors hover:bg-[#7d8f7a]/15"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-bold text-[#51634e]">
                                                        {appointment.start} – {appointment.end}
                                                    </p>

                                                    <Badge
                                                        variant="secondary"
                                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClasses[appointment.status]}`}
                                                    >
                                                        {statusLabels[appointment.status]}
                                                    </Badge>
                                                </div>

                                                <p className="mt-1 truncate text-sm font-semibold text-[#373432]">{appointment.patient_name}</p>

                                                <p className="mt-0.5 truncate text-xs text-[#706a67]">
                                                    {appointment.service} · {appointment.duration_minutes} min
                                                </p>

                                                {appointment.package ? (
                                                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <PackageProgressBadge package={appointment.package} />

                                                        {appointment.package.balance_cents > 0 && (
                                                            <span className="text-[11px] font-semibold text-[#c98796]">
                                                                Debe {formatMoney(appointment.package.balance_cents)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    appointment.service_value_cents !== null && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <Badge
                                                                variant="secondary"
                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${paymentStatusBadgeClasses[appointment.payment_status]}`}
                                                            >
                                                                {paymentStatusLabels[appointment.payment_status]}
                                                            </Badge>

                                                            {appointment.balance_cents !== null && appointment.balance_cents > 0 && (
                                                                <span className="text-[11px] font-semibold text-[#c98796]">
                                                                    Debe {formatMoney(appointment.balance_cents)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </Link>

                                            {appointment.can_reschedule && (
                                                <RescheduleAppointmentDialog
                                                    appointment={appointment}
                                                    triggerClassName="w-full rounded-full border-[#eadedf] bg-white px-3 text-xs font-bold text-[#706a67] hover:border-[#7d8f7a] hover:text-[#6f826c]"
                                                />
                                            )}
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
