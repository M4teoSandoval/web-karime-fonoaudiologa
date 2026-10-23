<?php

namespace App\Support;

use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\Payment;
use Illuminate\Support\Carbon;

/**
 * Transforma modelos en arreglos estables para las páginas de Inertia.
 * Centralizar esta lógica evita que la agenda, el dashboard y el detalle de
 * una cita muestren cálculos financieros distintos.
 */
final class AppointmentPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function summary(AppointmentRequest $appointment): array
    {
        return [
            'id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'patient_name' => $appointment->patient_name,
            'patient_phone' => $appointment->patient_phone,
            'service' => $appointment->service,
            'status' => $appointment->status,
            'source' => $appointment->source,
            'duration_minutes' => $appointment->duration_minutes,
            'service_value_cents' => $appointment->service_value_cents,
            'total_paid_cents' => $appointment->totalPaidCents(),
            'balance_cents' => $appointment->balanceCents(),
            'payment_status' => $appointment->paymentStatus(),
            'confirmed_start' => $appointment->confirmed_start?->toDateTimeString(),
            'confirmed_end' => $appointment->confirmed_end?->toDateTimeString(),
            'attended_at' => $appointment->attended_at?->toDateTimeString(),
            'cancelled_at' => $appointment->cancelled_at?->toDateTimeString(),
            'no_show_at' => $appointment->no_show_at?->toDateTimeString(),
            'created_at' => $appointment->created_at?->toDateTimeString(),
            'updated_at' => $appointment->updated_at?->toDateTimeString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function detail(AppointmentRequest $appointment, bool $includeMessages = true): array
    {
        $data = self::summary($appointment);

        $data['proposed_slots'] = $appointment->proposed_slots;
        $data['notes'] = $appointment->notes;
        $data['patient'] = $appointment->relationLoaded('patient') && $appointment->patient !== null
            ? self::patientSummary($appointment->patient)
            : null;

        $data['payments'] = $appointment->relationLoaded('payments')
            ? $appointment->payments
                ->sortBy([['paid_on', 'asc'], ['id', 'asc']])
                ->values()
                ->map(fn (Payment $payment) => self::payment($payment))
                ->all()
            : [];

        $data['proposal_message'] = $includeMessages && $appointment->hasProposedSlots()
            ? AppointmentRequest::buildProposalMessage($appointment->patient_name, $appointment->proposed_slots ?? [])
            : null;

        $data['confirmation_message'] = $includeMessages && $appointment->confirmed_start
            ? AppointmentRequest::buildConfirmationMessage(
                $appointment->patient_name,
                $appointment->confirmed_start->toDateTimeString(),
            )
            : null;

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public static function payment(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'appointment_id' => $payment->appointment_id,
            'amount_cents' => $payment->amount_cents,
            'paid_on' => $payment->paid_on?->toDateString(),
            'method' => $payment->method,
            'notes' => $payment->notes,
            'recorded_by_name' => $payment->relationLoaded('recorder') ? $payment->recorder?->name : null,
            'voided_at' => $payment->voided_at?->toDateTimeString(),
            'void_reason' => $payment->void_reason,
            'voided_by_name' => $payment->relationLoaded('voider') ? $payment->voider?->name : null,
            'created_at' => $payment->created_at?->toDateTimeString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function patientSummary(Patient $patient): array
    {
        return [
            'id' => $patient->id,
            'name' => $patient->name,
            'phone' => $patient->phone,
            'created_at' => $patient->created_at?->toDateTimeString(),
        ];
    }

    public static function monthLabel(Carbon $date): string
    {
        return ucfirst($date->locale('es')->translatedFormat('F \d\e Y'));
    }
}
