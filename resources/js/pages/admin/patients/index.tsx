import AdminLayout from '@/layouts/admin-layout';
import { formatDateShort } from '@/lib/appointments';
import { formatMoney } from '@/lib/money';
import { type PaginationMeta, type PatientListItem } from '@/types';
import { Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface PatientsIndexProps {
    patients: PatientListItem[];
    pagination: PaginationMeta;
    filters: { q: string | null };
}

export default function PatientsIndex({ patients, pagination, filters }: PatientsIndexProps) {
    const [query, setQuery] = useState(filters.q ?? '');

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get('/admin/pacientes', { q: query.trim() || undefined }, { preserveState: true, preserveScroll: true });
    };

    const goToPage = (page: number) => {
        router.get('/admin/pacientes', { q: filters.q ?? undefined, page }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AdminLayout title="Pacientes">
            <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#eadedf] bg-white p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b3aaa6]" />

                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por nombre o teléfono"
                        aria-label="Buscar paciente"
                        className="h-11 w-full rounded-xl border border-[#ded4d4] bg-[#fcfaf9] pr-3 pl-9 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                    />
                </div>

                <button
                    type="submit"
                    className="rounded-full bg-[#7d8f7a] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6f826c]"
                >
                    Buscar
                </button>

                {filters.q && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            router.get('/admin/pacientes', {}, { preserveState: true, preserveScroll: true });
                        }}
                        className="rounded-full border border-[#eadedf] px-4 py-2.5 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#d99aa8] hover:text-[#d99aa8]"
                    >
                        Limpiar
                    </button>
                )}

                <p className="text-sm text-[#706a67] sm:ml-auto">{pagination.total} paciente(s)</p>
            </form>

            {patients.length === 0 ? (
                <div className="rounded-2xl border border-[#eadedf] bg-white p-10 text-center">
                    <UserRound className="mx-auto size-6 text-[#d99aa8]" />

                    <p className="mt-3 text-sm font-semibold text-[#373432]">
                        {filters.q ? 'No hay pacientes que coincidan con la búsqueda' : 'Todavía no hay pacientes registrados'}
                    </p>

                    <p className="mt-1 text-sm text-[#706a67]">
                        {filters.q
                            ? 'Prueba con otro nombre o número de teléfono.'
                            : 'Los pacientes se crean al agendar una cita o al vincular una solicitud pública.'}
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {patients.map((patient) => (
                        <li key={patient.id}>
                            <Link
                                href={`/admin/pacientes/${patient.id}`}
                                className="group flex flex-col gap-3 rounded-2xl border border-[#eadedf] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(85,72,74,0.08)] sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-[#373432]">{patient.name}</p>
                                    <p className="mt-1 text-sm text-[#706a67]">{patient.phone ?? 'Sin teléfono registrado'}</p>

                                    <p className="mt-1 text-xs text-[#706a67]">
                                        {patient.appointments_count} cita(s)
                                        {patient.last_appointment_at ? ` · Última: ${formatDateShort(patient.last_appointment_at)}` : ''}
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-4 text-right">
                                    <div>
                                        <p className="text-[11px] font-bold tracking-wide text-[#7d8f7a] uppercase">Pagado</p>
                                        <p className="text-sm font-bold text-[#373432]">{formatMoney(patient.total_paid_cents)}</p>
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-bold tracking-wide text-[#7d8f7a] uppercase">Saldo</p>
                                        <p className={`text-sm font-bold ${patient.outstanding_cents > 0 ? 'text-[#c98796]' : 'text-[#6f826c]'}`}>
                                            {formatMoney(patient.outstanding_cents)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

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
