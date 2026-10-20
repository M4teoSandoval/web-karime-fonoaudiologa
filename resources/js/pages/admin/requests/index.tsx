import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, statusBadgeClasses, statusLabels } from '@/lib/appointments';
import { type AppointmentRequest, type AppointmentStatus, type PaginationMeta } from '@/types';
import { Link, router } from '@inertiajs/react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface RequestsIndexProps {
    appointments: AppointmentRequest[];
    pagination: PaginationMeta;
    filters: { status: AppointmentStatus | null; service: string | null };
    services: string[];
}

export default function RequestsIndex({ appointments, pagination, filters, services }: RequestsIndexProps) {
    const applyFilter = (key: 'status' | 'service', value: string) => {
        router.get(
            '/admin/solicitudes',
            { ...filters, [key]: value === 'all' ? null : value },
            { preserveState: true, preserveScroll: true },
        );
    };

    const goToPage = (page: number) => {
        router.get('/admin/solicitudes', { ...filters, page }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AdminLayout title="Solicitudes">
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#eadedf] bg-white p-5 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                    <label htmlFor="filter-status" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                        Estado
                    </label>

                    <select
                        id="filter-status"
                        value={filters.status ?? 'all'}
                        onChange={(event) => applyFilter('status', event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                    >
                        <option value="all">Todos los estados</option>

                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 space-y-1.5">
                    <label htmlFor="filter-service" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                        Servicio
                    </label>

                    <select
                        id="filter-service"
                        value={filters.service ?? 'all'}
                        onChange={(event) => applyFilter('service', event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                    >
                        <option value="all">Todos los servicios</option>

                        {services.map((service) => (
                            <option key={service} value={service}>
                                {service}
                            </option>
                        ))}
                    </select>
                </div>

                <p className="text-sm text-[#706a67]">{pagination.total} solicitudes</p>
            </div>

            {/* List */}
            {appointments.length === 0 ? (
                <div className="rounded-2xl border border-[#eadedf] bg-white p-10 text-center">
                    <Search className="mx-auto size-6 text-[#d99aa8]" />

                    <p className="mt-3 text-sm font-semibold text-[#373432]">No hay solicitudes con esos filtros</p>

                    <p className="mt-1 text-sm text-[#706a67]">Ajusta los filtros o espera nuevas solicitudes de pacientes.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {appointments.map((appointment) => (
                        <li key={appointment.id}>
                            <Link
                                href={`/admin/solicitudes/${appointment.id}`}
                                className="group flex flex-col gap-3 rounded-2xl border border-[#eadedf] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(85,72,74,0.08)] sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-[#373432]">{appointment.patient_name}</p>

                                    <p className="mt-1 text-sm text-[#706a67]">
                                        {appointment.service} · {appointment.duration_minutes} min
                                    </p>

                                    <p className="mt-0.5 text-xs text-[#706a67]">Registrada el {formatDate(appointment.created_at)}</p>
                                </div>

                                <div className="flex shrink-0 items-center gap-4">
                                    <Badge
                                        variant="secondary"
                                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadgeClasses[appointment.status]}`}
                                    >
                                        {statusLabels[appointment.status]}
                                    </Badge>

                                    <ArrowUpRight className="size-4 text-[#706a67] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#d99aa8]" />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {/* Pagination */}
            {pagination.last_page > 1 && (
                <nav className="mt-6 flex items-center justify-between" aria-label="Paginación">
                    <button
                        type="button"
                        onClick={() => goToPage(pagination.current_page - 1)}
                        disabled={pagination.current_page <= 1}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft className="size-4" />
                        Anterior
                    </button>

                    <span className="text-sm text-[#706a67]">
                        Página {pagination.current_page} de {pagination.last_page}
                    </span>

                    <button
                        type="button"
                        onClick={() => goToPage(pagination.current_page + 1)}
                        disabled={pagination.current_page >= pagination.last_page}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Siguiente
                        <ChevronRight className="size-4" />
                    </button>
                </nav>
            )}
        </AdminLayout>
    );
}
