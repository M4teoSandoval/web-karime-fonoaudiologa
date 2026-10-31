import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatDateTime, localTodayIso, statusBadgeClasses, statusLabels } from '@/lib/appointments';
import { formatMoney } from '@/lib/money';
import { type AppointmentRequest, type AppointmentStatus, type DashboardMonthSummary } from '@/types';
import { Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CalendarCheck,
    ClipboardList,
    Clock3,
    TrendingDown,
    TrendingUp,
    TriangleAlert,
    Users,
    Wallet,
} from 'lucide-react';

interface DashboardFinance {
    income_cents: number;
    previous_income_cents: number;
    variation_percent: number | null;
    attended_count: number;
    attended_patients_count: number;
    new_patients_count: number;
    outstanding_cents: number;
}

interface DashboardProps {
    period: string;
    period_label: string;
    previous_period: string;
    next_period: string | null;
    is_current_period: boolean;
    finance: DashboardFinance;
    counts: Record<AppointmentStatus, number>;
    upcoming: AppointmentRequest[];
    recent: AppointmentRequest[];
    monthly: DashboardMonthSummary[];
    hasSchedules: boolean;
}

export default function AdminDashboard({
    period,
    period_label,
    previous_period,
    next_period,
    is_current_period,
    finance,
    counts,
    upcoming,
    recent,
    monthly,
    hasSchedules,
}: DashboardProps) {
    const cards = [
        { label: 'Pendientes', value: counts.pending, accent: 'text-[#c98796]' },
        { label: 'Con horarios propuestos', value: counts.slots_proposed, accent: 'text-[#7d8f7a]' },
        { label: 'Citas confirmadas', value: counts.confirmed, accent: 'text-[#6f826c]' },
        { label: 'Atendidas', value: counts.attended, accent: 'text-[#51634e]' },
        { label: 'No realizadas', value: counts.no_show, accent: 'text-[#a14444]' },
        { label: 'Canceladas', value: counts.cancelled, accent: 'text-[#706a67]' },
    ];

    const navigateToMonth = (month: string) => {
        router.get('/admin', { month }, { preserveState: true, preserveScroll: true });
    };

    const maxIncome = Math.max(...monthly.map((month) => month.income_cents), 1);
    const variation = finance.variation_percent;
    const variationPositive = (variation ?? 0) >= 0;

    return (
        <AdminLayout title="Resumen">
            {!hasSchedules && (
                <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#d99aa8]/30 bg-[#fdeef1] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#c98796]" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-[#373432]">Aún no has configurado tus horarios de atención</p>
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

            {/* Period selector */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#eadedf] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                    <p className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Periodo financiero</p>
                    <p className="mt-0.5 text-lg font-semibold text-[#373432] capitalize">{period_label}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigateToMonth(previous_period)}
                        className="rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#7d8f7a] hover:text-[#6f826c]"
                    >
                        Mes anterior
                    </button>

                    <label className="sr-only" htmlFor="dashboard-month">
                        Mes y año
                    </label>

                    <input
                        id="dashboard-month"
                        type="month"
                        value={period}
                        max={localTodayIso().slice(0, 7)}
                        onChange={(event) => {
                            if (event.target.value) {
                                navigateToMonth(event.target.value);
                            }
                        }}
                        className="h-10 rounded-full border border-[#eadedf] bg-[#fcfaf9] px-4 text-sm font-semibold text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                    />

                    <button
                        type="button"
                        onClick={() => next_period && navigateToMonth(next_period)}
                        disabled={!next_period}
                        className="rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors hover:border-[#7d8f7a] hover:text-[#6f826c] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Mes siguiente
                    </button>

                    {!is_current_period && (
                        <button
                            type="button"
                            onClick={() => router.get('/admin', {}, { preserveState: true, preserveScroll: true })}
                            className="rounded-full bg-[#7d8f7a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f826c]"
                        >
                            Mes actual
                        </button>
                    )}
                </div>
            </div>

            {/* Financial cards */}
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0 rounded-2xl border border-[#7d8f7a]/40 bg-[#7d8f7a]/8 p-5 sm:p-6">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#6f826c] uppercase">
                        <Wallet className="size-4" />
                        Ingresos recibidos
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#51634e]">{formatMoney(finance.income_cents)}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Por fecha efectiva del pago</p>
                </div>

                <div className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                        {variationPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                        Vs. mes anterior
                    </p>

                    {variation === null ? (
                        <>
                            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#706a67]">—</p>
                            <p className="mt-1 text-xs text-[#706a67]">
                                {finance.previous_income_cents > 0
                                    ? `Mes anterior: ${formatMoney(finance.previous_income_cents)}`
                                    : 'Sin ingresos registrados el mes anterior'}
                            </p>
                        </>
                    ) : (
                        <>
                            <p
                                className={`mt-2 text-3xl font-semibold tracking-[-0.03em] ${variationPositive ? 'text-[#6f826c]' : 'text-[#a14444]'}`}
                            >
                                {variationPositive ? '+' : ''}
                                {variation.toLocaleString('es-CO')}%
                            </p>
                            <p className="mt-1 text-xs text-[#706a67]">Mes anterior: {formatMoney(finance.previous_income_cents)}</p>
                        </>
                    )}
                </div>

                <div className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                        <CalendarCheck className="size-4" />
                        Citas atendidas
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#373432]">{finance.attended_count}</p>
                    <p className="mt-1 text-xs text-[#706a67]">{finance.attended_patients_count} paciente(s) atendido(s)</p>
                </div>

                <div className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6">
                    <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                        <Clock3 className="size-4" />
                        Saldo por cobrar
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#c98796]">{formatMoney(finance.outstanding_cents)}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Citas vigentes con saldo pendiente</p>
                </div>
            </div>

            {/* Monthly summary */}
            <section className="mt-8 min-w-0 rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="monthly-heading">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="monthly-heading" className="text-lg font-semibold text-[#373432]">
                            Resumen mensual
                        </h2>
                        <p className="mt-1 text-sm text-[#706a67]">Ingresos y citas atendidas en los últimos seis meses.</p>
                    </div>

                    <p className="text-xs font-semibold text-[#706a67]">{finance.new_patients_count} paciente(s) nuevo(s) este mes</p>
                </div>

                <ul className="mt-5 space-y-4">
                    {monthly.map((month) => {
                        const width = month.income_cents > 0 ? Math.max(4, Math.round((month.income_cents / maxIncome) * 100)) : 0;

                        return (
                            <li key={month.period} className="grid grid-cols-[72px_1fr_auto] items-center gap-3">
                                <span className={`text-xs font-bold capitalize ${month.period === period ? 'text-[#6f826c]' : 'text-[#706a67]'}`}>
                                    {month.label}
                                </span>

                                <span className="h-3 overflow-hidden rounded-full bg-[#f4efed]" aria-hidden="true">
                                    <span
                                        className={`block h-full rounded-full ${month.period === period ? 'bg-[#7d8f7a]' : 'bg-[#7d8f7a]/45'}`}
                                        style={{ width: `${width}%` }}
                                    />
                                </span>

                                <span className="text-right text-xs font-semibold text-[#373432]">
                                    {formatMoney(month.income_cents)}
                                    <span className="ml-2 hidden text-[11px] font-normal text-[#706a67] sm:inline">{month.attended_count} cita(s)</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section className="mt-8" aria-labelledby="status-heading">
                <h2 id="status-heading" className="mb-4 text-lg font-semibold text-[#373432]">
                    Estado de las citas
                </h2>

                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {cards.map((card) => (
                        <div key={card.label} className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-4">
                            <p className={`text-2xl font-semibold tracking-[-0.03em] ${card.accent}`}>{card.value}</p>
                            <p className="mt-1 text-xs leading-5 text-[#706a67]">{card.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Próximas citas */}
                <section className="min-w-0 overflow-hidden rounded-2xl border border-[#eadedf] bg-white p-4 sm:p-6" aria-labelledby="upcoming-heading">
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
                            {upcoming.map((appointment) => {
                                const balanceCents = appointment.package ? appointment.package.balance_cents : appointment.balance_cents;

                                return (
                                    <li key={appointment.id} className="min-w-0">
                                        <Link
                                            href={`/admin/solicitudes/${appointment.id}`}
                                            className="group flex min-w-0 flex-col gap-1.5 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-[#373432]">{appointment.patient_name}</p>
                                                <p className="mt-0.5 break-words text-xs leading-5 text-[#706a67]">
                                                    {appointment.service} · {appointment.duration_minutes} min
                                                    {appointment.package
                                                        ? ` · Sesión ${appointment.package.session_number ?? '—'} de ${appointment.package.sessions_count}`
                                                        : ''}
                                                    {balanceCents !== null && balanceCents > 0
                                                        ? ` · Saldo ${formatMoney(balanceCents)}${appointment.package ? ' del paquete' : ''}`
                                                        : ''}
                                                </p>
                                            </div>

                                            <span className="block max-w-full break-words text-xs font-semibold leading-5 text-[#7d8f7a] sm:shrink-0 sm:text-right">
                                                {formatDateTime(appointment.confirmed_start)}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* Solicitudes recientes */}
                <section className="min-w-0 overflow-hidden rounded-2xl border border-[#eadedf] bg-white p-4 sm:p-6" aria-labelledby="recent-heading">
                    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <ClipboardList className="size-5 shrink-0 text-[#d99aa8]" />
                            <h2 id="recent-heading" className="min-w-0 text-lg font-semibold text-[#373432]">
                                Solicitudes recientes
                            </h2>
                        </div>

                        <Link href="/admin/solicitudes" className="shrink-0 text-sm font-semibold text-[#7d8f7a] hover:text-[#6f826c]">
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
                                        <div className="w-full min-w-0 flex-1 sm:w-auto">
                                            <p className="truncate text-sm font-bold text-[#373432]">{appointment.patient_name}</p>
                                            <p className="mt-0.5 break-words text-xs leading-5 text-[#706a67]">
                                                {appointment.service} · {formatDate(appointment.created_at)}
                                            </p>
                                        </div>

                                        <Badge
                                            variant="secondary"
                                            className={`max-w-full shrink-0 rounded-full px-2.5 py-1 text-[11px] leading-4 font-bold whitespace-normal break-words ${statusBadgeClasses[appointment.status]}`}
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
                <Users className="mt-0.5 size-3.5 shrink-0" />
                <span>
                    Los ingresos se cuentan por la fecha efectiva del pago. Los horarios propuestos no reservan el espacio: la cita queda
                    reservada solo al confirmarla.
                </span>
            </p>
        </AdminLayout>
    );
}
