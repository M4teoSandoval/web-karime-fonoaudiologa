<?php

namespace App\Services;

use App\Models\AppointmentRequest;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    /**
     * Registra un pago comprobando el saldo dentro de una transacción.
     *
     * @param  array{amount_cents:int, paid_on:string, method?:?string, notes?:?string, idempotency_key?:?string}  $data
     */
    public function record(AppointmentRequest $appointment, array $data, ?User $user): Payment
    {
        return DB::transaction(function () use ($appointment, $data, $user) {
            $locked = AppointmentRequest::query()
                ->whereKey($appointment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            return $this->recordLocked($locked, $data, $user);
        });
    }

    /**
     * Variante para usar dentro de una transacción que ya bloqueó la cita
     * (por ejemplo, al marcarla como atendida y registrar el pago a la vez).
     *
     * @param  array{amount_cents:int, paid_on:string, method?:?string, notes?:?string, idempotency_key?:?string}  $data
     */
    public function recordLocked(AppointmentRequest $appointment, array $data, ?User $user): Payment
    {
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // Reenvíos, dobles clics o reintentos con la misma clave devuelven el
        // pago ya creado en lugar de duplicarlo.
        if ($idempotencyKey !== null && $idempotencyKey !== '') {
            $existing = Payment::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        if ($appointment->status === AppointmentRequest::STATUS_CANCELLED) {
            throw ValidationException::withMessages([
                'payment_amount' => 'No se pueden registrar pagos nuevos en una cita cancelada. Si necesitas corregir un pago existente, anúlalo con un motivo.',
            ]);
        }

        if ($appointment->service_value_cents === null || $appointment->service_value_cents <= 0) {
            throw ValidationException::withMessages([
                'payment_amount' => 'Primero define el valor acordado del servicio para poder registrar pagos.',
            ]);
        }

        $amount = (int) ($data['amount_cents'] ?? 0);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'payment_amount' => 'El importe del pago debe ser mayor que cero.',
            ]);
        }

        // El bloqueo de la fila de la cita serializa los pagos concurrentes.
        $paid = (int) $appointment->activePayments()->sum('amount_cents');
        $balance = (int) $appointment->service_value_cents - $paid;

        if ($amount > $balance) {
            throw ValidationException::withMessages([
                'payment_amount' => 'El pago supera el saldo pendiente. Saldo actual: $'.number_format(max(0, $balance), 0, ',', '.').'. Corrige el valor acordado o registra un importe menor.',
            ]);
        }

        try {
            return Payment::create([
                'appointment_id' => $appointment->id,
                'amount_cents' => $amount,
                'paid_on' => $data['paid_on'],
                'method' => $data['method'] ?? null,
                'notes' => isset($data['notes']) && $data['notes'] !== null && trim((string) $data['notes']) !== ''
                    ? trim((string) $data['notes'])
                    : null,
                'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                'recorded_by' => $user?->id,
            ]);
        } catch (UniqueConstraintViolationException $exception) {
            // Carrera entre dos envíos simultáneos con la misma clave: se
            // devuelve el pago que ganó la carrera, nunca uno duplicado.
            if ($idempotencyKey !== null && $idempotencyKey !== '') {
                $existing = Payment::query()->where('idempotency_key', $idempotencyKey)->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            throw $exception;
        }
    }

    /**
     * Anula un pago sin borrarlo, conservando importe, fecha y motivo.
     */
    public function void(Payment $payment, string $reason, ?User $user): Payment
    {
        return DB::transaction(function () use ($payment, $reason, $user) {
            $locked = Payment::query()
                ->whereKey($payment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->voided_at !== null) {
                throw ValidationException::withMessages([
                    'void_reason' => 'Este pago ya fue anulado anteriormente.',
                ]);
            }

            $locked->update([
                'voided_at' => now(),
                'void_reason' => trim($reason),
                'voided_by' => $user?->id,
            ]);

            return $locked;
        });
    }
}
