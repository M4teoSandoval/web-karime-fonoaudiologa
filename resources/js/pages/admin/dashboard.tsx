
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime, statusBadgeClasses, statusLabels } from '@/lib/appointments';
import { type AppointmentRequest, type AppointmentStatus } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, CalendarCheck, ClipboardList, Clock3, TriangleAlert } from 'lucide-react';

interface DashboardProps {
    counts: Record<AppointmentStatus, number>;
    upcoming: AppointmentRequest[];
    recent: AppointmentRequest[];
    hasSchedules: boolean;
}

export default function AdminDashboard({ counts, upcoming, recent, hasSchedules }: DashboardProps) {
    const cards = [
        { label: 'Pendientes', value: counts.pending, accent: 'text-[#c98796]' },
        { label: 'Con horarios propuestos', value: counts.slots_proposed, accent: 'text-[#7d8f7a]' },
        { label: 'Citas confirmadas', value: counts.confirmed, accent: 'text-[#6f826c]' },
        { label: 'Canceladas', value: counts.cancelled, accent: 'text-[#706a67]' },
    ];

    return (
        <AdminLayout title="Resumen">
            {!hasSchedules && (
                <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#d99aa8]/30 bg-[#fdeef1] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#c98796]" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-[#373432]">
                                Aún no has configurado tus horarios de atención
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#706a67]">
                                Define tus días y horas habituales para que el sistema pueda calcular los espacios disponibles.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/admin/horarios"
                        className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#d99aa8] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#c98796]"
                    >
                        Configurar horarios
                        <ArrowUpRight className="size-4" />
                    </Link>
                </div>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.label} className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6">
                        <p className={`text-3xl font-semibold tracking-[-0.03em] ${card.accent}`}>
                            {card.value}
                        </p>
                        <p className="mt-1 text-sm text-[#706a67]">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Próximas citas */}
                <section
                    className="min-w-0 overflow-hidden rounded-2xl border border-[#eadedf] bg-white p-4 sm:p-6"
                    aria-labelledby="upcoming-heading"
                >
                    <div className="mb-5 flex min-w-0 items-center gap-3">
                        <CalendarCheck className="size-5 shrink-0 text-[#7d8f7a]" />
                        <h2 id="upcoming-heading" className="min-w-0 text-lg font-semibold text-[#373432]">
                            Próximas citas
                        </h2>
                    </div>

                    {upcoming.length === 0 ? (
                        <p className="text-sm text-[#706a67]">No hay citas confirmadas próximas.</p>
                    ) : (
                        <ul className="min-w-0 divide-y divide-[#eadedf]">
                            {upcoming.map((appointment) => (
                                <li key={appointment.id} className="min-w-0">
                                    <Link
                                        href={`/admin/solicitudes/${appointment.id}`}
                                        className="group flex min-w-0 flex-col gap-1.5 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-[#373432]">
                                                {appointment.patient_name}
                                            </p>
                                            <p className="mt-0.5 break-words text-xs leading-5 text-[#706a67]">
                                                {appointment.service} · {appointment.duration_minutes} min
                                            </p>
                                        </div>

                                        <span className="block max-w-full break-words text-xs font-semibold leading-5 text-[#7d8f7a] sm:shrink-0 sm:text-right">
                                            {formatDateTime(appointment.confirmed_start)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Solicitudes recientes */}
                <section
                    className="min-w-0 overflow-hidden rounded-2xl border border-[#eadedf] bg-white p-4 sm:p-6"
                    aria-labelledby="recent-heading"
                >
                    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <ClipboardList className="size-5 shrink-0 text-[#d99aa8]" />
                            <h2 id="recent-heading" className="min-w-0 text-lg font-semibold text-[#373432]">
                                Solicitudes recientes
                            </h2>
                        </div>

                        <Link
                            href="/admin/solicitudes"
                            className="shrink-0 text-sm font-semibold text-[#7d8f7a] hover:text-[#6f826c]"
                        >
                            Ver todas
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <p className="text-sm text-[#706a67]">No hay solicitudes pendientes de gestión.</p>
                    ) : (
                        <ul className="min-w-0 divide-y divide-[#eadedf]">
                            {recent.map((appointment) => (
                                <li key={appointment.id} className="min-w-0">
                                    <Link
                                        href={`/admin/solicitudes/${appointment.id}`}
                                        className="group flex min-w-0 flex-col items-start gap-2 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                    >
                                        <div className="min-w-0 w-full flex-1 sm:w-auto">
                                            <p className="truncate text-sm font-bold text-[#373432]">
                                                {appointment.patient_name}
                                            </p>
                                            <p className="mt-0.5 break-words text-xs leading-5 text-[#706a67]">
                                                {appointment.service} · {formatDate(appointment.created_at)}
                                            </p>
                                        </div>

                                        <Badge
                                            variant="secondary"
                                            className={`max-w-full shrink-0 whitespace-normal break-words rounded-full px-2.5 py-1 text-[11px] font-bold leading-4 ${statusBadgeClasses[appointment.status]}`}
                                        >
                                            {statusLabels[appointment.status]}
                                        </Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <p className="mt-8 inline-flex max-w-full items-start gap-2 text-xs leading-5 text-[#706a67]">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" />
                <span>
                    Recuerda: los horarios propuestos no reservan el espacio. La cita queda reservada solo al confirmarla.
                </span>
            </p>
        </AdminLayout>
    );
}
