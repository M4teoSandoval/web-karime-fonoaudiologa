<?php

namespace App\Services;

use App\Models\AppointmentRequest;
use App\Models\Payment;
use App\Models\ServicePackage;
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
        /*
            Una sesión de paquete no tiene valor propio: el saldo se controla
            en el paquete para que un abono se registre una sola vez y no se
            repita por cada una de las sesiones.
        */
        if ($appointment->package_id !== null) {
            $package = ServicePackage::query()
                ->whereKey($appointment->package_id)
                ->firstOrFail();

            return $this->createPackagePayment($package, $appointment, $data, $user);
        }

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
     * Registra un pago a cuenta del paquete. La sesión indicada actúa como
     * ancla del movimiento (queda registrado desde qué sesión se cobró), pero
     * el saldo y el límite se calculan siempre contra el paquete completo.
     *
     * @param  array{amount_cents:int, paid_on:string, method?:?string, notes?:?string, idempotency_key?:?string}  $data
     */
    public function recordPackageLocked(ServicePackage $package, AppointmentRequest $anchor, array $data, ?User $user): Payment
    {
        return $this->createPackagePayment($package, $anchor, $data, $user);
    }

    /**
     * Registra un pago del paquete bloqueando la fila del paquete para
     * serializar cobros simultáneos.
     *
     * @param  array{amount_cents:int, paid_on:string, method?:?string, notes?:?string, idempotency_key?:?string}  $data
     */
    public function recordForPackage(ServicePackage $package, array $data, ?User $user): Payment
    {
        return DB::transaction(function () use ($package, $data, $user) {
            $locked = ServicePackage::query()
                ->whereKey($package->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $anchor = AppointmentRequest::query()
                ->where('package_id', $locked->getKey())
                ->orderBy('package_session_number')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if ($anchor === null) {
                throw ValidationException::withMessages([
                    'payment_amount' => 'Este paquete no tiene sesiones registradas. No es posible asociar el pago.',
                ]);
            }

            return $this->createPackagePayment($locked, $anchor, $data, $user);
        });
    }

    /**
     * @param  array{amount_cents:int, paid_on:string, method?:?string, notes?:?string, idempotency_key?:?string}  $data
     */
    private function createPackagePayment(ServicePackage $package, AppointmentRequest $anchor, array $data, ?User $user): Payment
    {
        $idempotencyKey = $data['idempotency_key'] ?? null;

        if ($idempotencyKey !== null && $idempotencyKey !== '') {
            $existing = Payment::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        if ((int) $package->total_value_cents <= 0) {
            throw ValidationException::withMessages([
                'payment_amount' => 'El paquete no tiene un valor total definido. Corrígelo antes de registrar pagos.',
            ]);
        }

        $amount = (int) ($data['amount_cents'] ?? 0);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'payment_amount' => 'El importe del pago debe ser mayor que cero.',
            ]);
        }

        $paid = (int) $package->activePayments()->sum('amount_cents');
        $balance = (int) $package->total_value_cents - $paid;

        if ($amount > $balance) {
            throw ValidationException::withMessages([
                'payment_amount' => 'El pago supera el saldo pendiente del paquete. Saldo actual: $'.number_format(max(0, $balance), 0, ',', '.').'. Registra un importe menor o corrige el valor total.',
            ]);
        }

        try {
            return Payment::create([
                'appointment_id' => $anchor->id,
                'package_id' => $package->id,
                'amount_cents' => $amount,
                'paid_on' => $data['paid_on'],
                'method' => $data['method'] ?? null,
                'notes' => isset($data['notes']) && $data['notes'] !== null && trim((string) $data['notes']) !== ''
                    ? trim((string) $data['notes'])
                    : null,
                'idempotency_key' => $idempotencyKey !== null && $idempotencyKey !== '' ? $idempotencyKey : null,
                'recorded_by' => $user?->id,
            ]);
        } catch (UniqueConstraintViolationException $exception) {
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
