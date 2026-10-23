import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { formatDateShort, paymentMethodLabels } from '@/lib/appointments';
import { centsToInput, formatMoney, inputToCents } from '@/lib/money';
import { type AppointmentRequest } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Ban, LoaderCircle, Plus, ReceiptText } from 'lucide-react';
import { type FormEvent } from 'react';

interface AppointmentPaymentsProps {
    appointment: AppointmentRequest;
}

interface PaymentForm {
    amount: string;
    paid_on: string;
    method: string;
    notes: string;
    idempotency_key: string;
    [key: string]: string | number | boolean | null | undefined;
}

function newKey(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localToday(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function AppointmentPayments({ appointment }: AppointmentPaymentsProps) {
    const payments = appointment.payments ?? [];
    const canCharge = appointment.service_value_cents !== null && appointment.service_value_cents > 0;
    const isCancelled = appointment.status === 'cancelled';
    const balance = appointment.balance_cents ?? 0;
    const hasBalance = canCharge && balance > 0;

    const { data, setData, post, processing, errors, reset } = useForm<PaymentForm>({
        amount: hasBalance ? centsToInput(balance) : '',
        paid_on: localToday(),
        method: '',
        notes: '',
        idempotency_key: newKey(),
    });

    const estimated = inputToCents(data.amount);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(route('admin.requests.payments.store', appointment.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset('amount', 'notes', 'method');
                setData('idempotency_key', newKey());
                setData('paid_on', localToday());
            },
        });
    };

    const handleVoid = (paymentId: number, amountCents: number) => {
        const reason = window.prompt(
            `¿Anular el pago de ${formatMoney(amountCents)}? Escribe el motivo. El movimiento no se borrará del historial.`,
        );

        if (reason === null) {
            return;
        }

        if (reason.trim().length < 3) {
            window.alert('El motivo debe tener al menos 3 caracteres.');
            return;
        }

        router.post(
            route('admin.requests.payments.void', [appointment.id, paymentId]),
            { reason: reason.trim() },
            { preserveScroll: true },
        );
    };

    return (
        <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="payments-heading">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 id="payments-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                        <ReceiptText className="size-5 text-[#7d8f7a]" />
                        Pagos y abonos
                    </h2>

                    <p className="mt-1 text-sm text-[#706a67]">Cada movimiento conserva su fecha efectiva, método y quién lo registró.</p>
                </div>

                <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tracking-wide text-[#7d8f7a] uppercase">Saldo</p>
                    <p className="text-lg font-bold text-[#373432]">{appointment.balance_cents === null ? '—' : formatMoney(balance)}</p>
                </div>
            </div>

            {payments.length === 0 ? (
                <p className="mt-4 rounded-xl bg-[#fcfaf9] px-4 py-3 text-sm text-[#706a67]">Todavía no hay pagos registrados para esta cita.</p>
            ) : (
                <ul className="mt-4 divide-y divide-[#eadedf]">
                    {payments.map((payment) => {
                        const voided = payment.voided_at !== null;

                        return (
                            <li key={payment.id} className={`py-3.5 ${voided ? 'opacity-60' : ''}`}>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className={`text-sm font-bold ${voided ? 'text-[#706a67] line-through' : 'text-[#373432]'}`}>
                                            {formatMoney(payment.amount_cents)} · {paymentMethodLabels[payment.method ?? ''] ?? 'Sin método'}
                                        </p>

                                        <p className="text-xs text-[#706a67]">
                                            Fecha efectiva: {formatDateShort(payment.paid_on)}
                                            {payment.recorded_by_name ? ` · Registrado por ${payment.recorded_by_name}` : ''}
                                        </p>

                                        {payment.notes && <p className="mt-1 text-xs leading-5 text-[#706a67]">{payment.notes}</p>}

                                        {voided && (
                                            <p className="mt-1 text-xs font-semibold text-[#a14444]">
                                                Anulado{payment.voided_by_name ? ` por ${payment.voided_by_name}` : ''}: {payment.void_reason}
                                            </p>
                                        )}
                                    </div>

                                    {!voided && (
                                        <button
                                            type="button"
                                            onClick={() => handleVoid(payment.id, payment.amount_cents)}
                                            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#706a67] transition-colors hover:text-[#a14444]"
                                        >
                                            <Ban className="size-3.5" />
                                            Anular
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!canCharge && (
                <p className="mt-4 rounded-xl bg-[#f3ecdc] px-4 py-3 text-sm leading-6 text-[#8a6d3b]">
                    Define primero el valor acordado del servicio para poder registrar pagos.
                </p>
            )}

            {canCharge && !hasBalance && (
                <p className="mt-4 rounded-xl bg-[#eef2ed] px-4 py-3 text-sm font-semibold text-[#51634e]">Esta cita está pagada en su totalidad.</p>
            )}

            {isCancelled && (
                <p className="mt-4 rounded-xl bg-[#fdecec] px-4 py-3 text-sm leading-6 text-[#a14444]">
                    La cita está cancelada: no se pueden registrar pagos nuevos. Los pagos existentes se conservan como ingreso.
                </p>
            )}

            {hasBalance && !isCancelled && (
                <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-[#eadedf] pt-5">
                    <p className="text-sm font-bold text-[#373432]">Registrar un pago</p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="payment-amount" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Importe
                            </label>

                            <input
                                id="payment-amount"
                                type="text"
                                inputMode="numeric"
                                value={data.amount}
                                onChange={(event) => setData('amount', event.target.value)}
                                placeholder={centsToInput(balance)}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />

                            {estimated !== null && estimated > 0 && (
                                <p className="text-xs text-[#706a67]">
                                    {formatMoney(estimated)} de {formatMoney(balance)} pendientes.
                                </p>
                            )}

                            <InputError message={errors.amount} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="payment-date" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Fecha efectiva
                            </label>

                            <input
                                id="payment-date"
                                type="date"
                                value={data.paid_on}
                                max={localToday()}
                                onChange={(event) => setData('paid_on', event.target.value)}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />

                            <InputError message={errors.paid_on} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="payment-method" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Método (opcional)
                            </label>

                            <select
                                id="payment-method"
                                value={data.method}
                                onChange={(event) => setData('method', event.target.value)}
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            >
                                <option value="">Sin especificar</option>
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Transferencia</option>
                                <option value="card">Tarjeta</option>
                                <option value="other">Otro</option>
                            </select>

                            <InputError message={errors.method} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="payment-notes" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                                Observación (opcional)
                            </label>

                            <input
                                id="payment-notes"
                                type="text"
                                value={data.notes}
                                onChange={(event) => setData('notes', event.target.value)}
                                placeholder="Ej. abono acordado"
                                className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                            />

                            <InputError message={errors.notes} />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="rounded-full bg-[#7d8f7a] px-5 text-sm font-bold text-white hover:bg-[#6f826c]"
                    >
                        {processing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                        Registrar pago
                    </Button>
                </form>
            )}
        </section>
    );
}
