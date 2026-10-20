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
            {/* Setup warning */}
            {!hasSchedules && (
                <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#d99aa8]/30 bg-[#fdeef1] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#c98796]" />

                        <div>
                            <p className="text-sm font-bold text-[#373432]">Aún no has configurado tus horarios de atención</p>

                            <p className="mt-1 text-sm leading-6 text-[#706a67]">
                                Define tus días y horas habituales para que el sistema pueda calcular los espacios disponibles.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/admin/horarios"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#d99aa8] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#c98796]"
                    >
                        Configurar horarios
                        <ArrowUpRight className="size-4" />
                    </Link>
                </div>
            )}

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-[#eadedf] bg-white p-6">
                        <p className={`text-3xl font-semibold tracking-[-0.03em] ${card.accent}`}>{card.value}</p>

                        <p className="mt-1 text-sm text-[#706a67]">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* Upcoming */}
                <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="upcoming-heading">
                    <div className="mb-5 flex items-center gap-3">
                        <CalendarCheck className="size-5 text-[#7d8f7a]" />

                        <h2 id="upcoming-heading" className="text-lg font-semibold text-[#373432]">
                            Próximas citas
                        </h2>
                    </div>

                    {upcoming.length === 0 ? (
                        <p className="text-sm text-[#706a67]">No hay citas confirmadas próximas.</p>
                    ) : (
                        <ul className="divide-y divide-[#eadedf]">
                            {upcoming.map((appointment) => (
                                <li key={appointment.id}>
                                    <Link
                                        href={`/admin/solicitudes/${appointment.id}`}
                                        className="group flex items-center justify-between gap-4 py-3.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-[#373432]">{appointment.patient_name}</p>

                                            <p className="mt-0.5 truncate text-xs text-[#706a67]">
                                                {appointment.service} · {appointment.duration_minutes} min
                                            </p>
                                        </div>

                                        <span className="shrink-0 text-xs font-semibold text-[#7d8f7a]">
                                            {formatDateTime(appointment.confirmed_start)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Recent */}
                <section className="rounded-2xl border border-[#eadedf] bg-white p-6" aria-labelledby="recent-heading">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="size-5 text-[#d99aa8]" />

                            <h2 id="recent-heading" className="text-lg font-semibold text-[#373432]">
                                Solicitudes recientes
                            </h2>
                        </div>

                        <Link href="/admin/solicitudes" className="text-sm font-semibold text-[#7d8f7a] hover:text-[#6f826c]">
                            Ver todas
                        </Link>
                    </div>

                    {recent.length === 0 ? (
                        <p className="text-sm text-[#706a67]">No hay solicitudes pendientes de gestión.</p>
                    ) : (
                        <ul className="divide-y divide-[#eadedf]">
                            {recent.map((appointment) => (
                                <li key={appointment.id}>
                                    <Link
                                        href={`/admin/solicitudes/${appointment.id}`}
                                        className="group flex items-center justify-between gap-4 py-3.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-[#373432]">{appointment.patient_name}</p>

                                            <p className="mt-0.5 truncate text-xs text-[#706a67]">
                                                {appointment.service} · {formatDate(appointment.created_at)}
                                            </p>
                                        </div>

                                        <Badge variant="secondary" className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClasses[appointment.status]}`}>
                                            {statusLabels[appointment.status]}
                                        </Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* Tip */}
            <p className="mt-8 inline-flex items-center gap-2 text-xs text-[#706a67]">
                <Clock3 className="size-3.5" />
                Recuerda: los horarios propuestos no reservan el espacio. La cita queda reservada solo al confirmarla.
            </p>
        </AdminLayout>
    );
}
