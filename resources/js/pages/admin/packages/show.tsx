import PackagePayments from '@/components/admin/package-payments';
import RescheduleAppointmentDialog from '@/components/admin/reschedule-appointment-dialog';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/layouts/admin-layout';
import {
    formatDateShort,
    formatDateTime,
    paymentStatusBadgeClasses,
    paymentStatusLabels,
    statusBadgeClasses,
    statusLabels,
} from '@/lib/appointments';
import { formatMoney } from '@/lib/money';
import { type PackageSession, type ServicePackage } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, CalendarRange, Layers, ReceiptText, UserRound, Wallet } from 'lucide-react';

interface PackageShowProps {
    package: ServicePackage;
}

function sessionTimestamp(session: PackageSession): string | null {
    return session.confirmed_start ?? session.attended_at ?? session.cancelled_at ?? session.no_show_at;
}

export default function PackageShow({ package: servicePackage }: PackageShowProps) {
    const patient = servicePackage.patient;
    const counts = servicePackage.counts;
    const completed = counts.attended;
    const progress = servicePackage.sessions_count > 0 ? Math.round((completed / servicePackage.sessions_count) * 100) : 0;

    return (
        <AdminLayout>
            <div className="mb-8 flex flex-col gap-4">
                <Link
                    href={patient ? `/admin/pacientes/${patient.id}` : '/admin/pacientes'}
                    className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#706a67] transition-colors hover:text-[#d99aa8]"
                >
                    <ArrowLeft className="size-4" />
                    {patient ? 'Volver al paciente' : 'Volver a pacientes'}
                </Link>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Paquete de sesiones</p>

                        <h1 className="mt-1 text-3xl tracking-[-0.03em] text-[#373432] sm:text-4xl">{servicePackage.service}</h1>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                                variant="secondary"
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${paymentStatusBadgeClasses[servicePackage.payment_status]}`}
                            >
                                {paymentStatusLabels[servicePackage.payment_status]}
                            </Badge>

                            <Badge
                                variant="secondary"
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#f3ecdc] px-3.5 py-1.5 text-xs font-bold text-[#8a6d3b]"
                            >
                                <Layers className="size-3.5" />
                                {servicePackage.sessions_count} sesiones · {servicePackage.duration_minutes} min cada una
                            </Badge>

                            {patient && (
                                <Link
                                    href={`/admin/pacientes/${patient.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#eadedf] bg-white px-3.5 py-1.5 text-xs font-bold text-[#706a67] transition-colors hover:border-[#7d8f7a] hover:text-[#6f826c]"
                                >
                                    <UserRound className="size-3.5" />
                                    {patient.name}
                                </Link>
                            )}
                        </div>

                        <p className="mt-2 text-sm text-[#706a67]">
                            Creado el {formatDateShort(servicePackage.created_at)}
                            {servicePackage.created_by_name ? ` por ${servicePackage.created_by_name}` : ''}
                        </p>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-[#eadedf] bg-white p-5 sm:min-w-[280px]">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">Avance del paquete</p>
                            <p className="text-sm font-bold text-[#51634e]">
                                {completed} de {servicePackage.sessions_count}
                            </p>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadedf]">
                            <div className="h-full rounded-full bg-[#7d8f7a] transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>

                        <p className="mt-2 text-xs text-[#706a67]">
                            {counts.programmed} programada(s) · {counts.cancelled + counts.no_show} cerrada(s) sin atender
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-[#373432]">{formatMoney(servicePackage.total_value_cents)}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Valor total</p>
                </div>

                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-[#6f826c]">{formatMoney(servicePackage.total_paid_cents)}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Pagado</p>
                </div>

                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className={`text-2xl font-semibold tracking-[-0.03em] ${servicePackage.balance_cents > 0 ? 'text-[#c98796]' : 'text-[#6f826c]'}`}>
                        {formatMoney(servicePackage.balance_cents)}
                    </p>
                    <p className="mt-1 text-xs text-[#706a67]">Saldo pendiente</p>
                </div>

                <div className="rounded-2xl border border-[#eadedf] bg-white p-4">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-[#51634e]">{counts.attended}</p>
                    <p className="mt-1 text-xs text-[#706a67]">Sesiones atendidas</p>
                </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="sessions-heading">
                        <h2 id="sessions-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <CalendarRange className="size-5 text-[#7d8f7a]" />
                            Sesiones del paquete
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-[#706a67]">
                            Cada sesión se maneja de forma individual. Puedes reprogramar o cancelar una sin afectar las demás; las sesiones
                            atendidas conservan su historial.
                        </p>

                        <ul className="mt-4 divide-y divide-[#eadedf]">
                            {servicePackage.sessions.map((session) => {
                                const timestamp = sessionTimestamp(session);

                                return (
                                    <li key={session.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#7d8f7a]/12 text-xs font-bold text-[#51634e]">
                                                {session.number ?? '—'}
                                            </span>

                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[#373432]">
                                                    Sesión {session.number ?? '—'}
                                                    <span className="ml-2 font-normal text-[#706a67]">{session.duration_minutes} min</span>
                                                </p>

                                                <p className="mt-0.5 text-xs text-[#706a67]">
                                                    {timestamp ? formatDateTime(timestamp) : 'Sin fecha definida'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses[session.status]}`}
                                            >
                                                {statusLabels[session.status]}
                                            </Badge>

                                            <Link
                                                href={session.url}
                                                className="inline-flex items-center gap-1 rounded-full border border-[#eadedf] bg-white px-3 py-1.5 text-xs font-bold text-[#706a67] transition-colors hover:border-[#7d8f7a] hover:text-[#6f826c]"
                                            >
                                                <CalendarDays className="size-3.5" />
                                                Ver sesión
                                            </Link>

                                            {session.can_reschedule && (
                                                <RescheduleAppointmentDialog
                                                    appointment={session}
                                                    triggerLabel="Reprogramar"
                                                    triggerClassName="rounded-full border-[#eadedf] bg-white px-3 py-1.5 text-xs font-bold text-[#706a67] hover:border-[#7d8f7a] hover:text-[#6f826c]"
                                                />
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <PackagePayments package={servicePackage} />
                </div>

                <div className="space-y-6">
                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="package-finance-heading">
                        <h2 id="package-finance-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                            <Wallet className="size-5 text-[#7d8f7a]" />
                            Resumen financiero
                        </h2>

                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-[#706a67]">Valor total</dt>
                                <dd className="font-bold text-[#373432]">{formatMoney(servicePackage.total_value_cents)}</dd>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-[#706a67]">Total pagado</dt>
                                <dd className="font-bold text-[#6f826c]">{formatMoney(servicePackage.total_paid_cents)}</dd>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-[#eadedf] pt-2">
                                <dt className="text-[#706a67]">Saldo pendiente</dt>
                                <dd className="font-bold text-[#c98796]">{formatMoney(servicePackage.balance_cents)}</dd>
                            </div>
                        </dl>

                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#706a67]">
                            <ReceiptText className="size-3.5" />
                            {servicePackage.payments.length} movimiento(s) registrado(s)
                        </p>
                    </section>

                    {servicePackage.notes && (
                        <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="package-notes-heading">
                            <h2 id="package-notes-heading" className="text-lg font-semibold text-[#373432]">
                                Observaciones del paquete
                            </h2>

                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#373432]">{servicePackage.notes}</p>
                        </section>
                    )}

                    <section className="rounded-2xl border border-[#eadedf] bg-white p-5 text-sm leading-6 text-[#706a67] sm:p-6">
                        <p className="font-bold text-[#373432]">Sesiones por estado</p>

                        <ul className="mt-3 space-y-1.5">
                            <li className="flex items-center justify-between gap-3">
                                <span>Atendidas</span>
                                <span className="font-bold text-[#51634e]">{counts.attended}</span>
                            </li>
                            <li className="flex items-center justify-between gap-3">
                                <span>Programadas</span>
                                <span className="font-bold text-[#6f826c]">{counts.programmed}</span>
                            </li>
                            <li className="flex items-center justify-between gap-3">
                                <span>Pendientes de confirmar</span>
                                <span className="font-bold text-[#8a6d3b]">{counts.pending}</span>
                            </li>
                            <li className="flex items-center justify-between gap-3">
                                <span>Canceladas</span>
                                <span className="font-bold text-[#706a67]">{counts.cancelled}</span>
                            </li>
                            <li className="flex items-center justify-between gap-3">
                                <span>No realizadas</span>
                                <span className="font-bold text-[#a14444]">{counts.no_show}</span>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
