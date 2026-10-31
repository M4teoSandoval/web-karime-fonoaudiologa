<?php

namespace App\Support;

use App\Models\AppointmentRequest;
use App\Models\AppointmentReschedule;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\ServicePackage;
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
        // La relación se carga explícitamente en los controladores para evitar
        // consultas por cada sesión de un paquete.
        $package = $appointment->relationLoaded('package') ? $appointment->package : null;

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
            'package_id' => $appointment->package_id,
            'package_session_number' => $appointment->package_session_number,
            'package' => $package !== null ? self::packageReference($package, $appointment) : null,
            'confirmed_start' => $appointment->confirmed_start?->toDateTimeString(),
            'confirmed_end' => $appointment->confirmed_end?->toDateTimeString(),
            'attended_at' => $appointment->attended_at?->toDateTimeString(),
            'cancelled_at' => $appointment->cancelled_at?->toDateTimeString(),
            'no_show_at' => $appointment->no_show_at?->toDateTimeString(),
            'created_at' => $appointment->created_at?->toDateTimeString(),
            'updated_at' => $appointment->updated_at?->toDateTimeString(),
            'can_reschedule' => $appointment->isReschedulable(),
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

        $data['package_detail'] = $appointment->relationLoaded('package') && $appointment->package !== null
            ? self::packageSummary($appointment->package, includeSessions: true)
            : null;

        $data['proposal_message'] = $includeMessages && $appointment->hasProposedSlots()
            ? AppointmentRequest::buildProposalMessage($appointment->patient_name, $appointment->proposed_slots ?? [])
            : null;

        $data['confirmation_message'] = $includeMessages && $appointment->confirmed_start
            ? AppointmentRequest::buildConfirmationMessage(
                $appointment->patient_name,
                $appointment->confirmed_start->toDateTimeString(),
            )
            : null;

        $data['reschedules'] = $appointment->relationLoaded('reschedules')
            ? $appointment->reschedules
                ->map(fn (AppointmentReschedule $reschedule) => self::reschedule($reschedule))
                ->all()
            : [];

        $latestReschedule = $data['reschedules'][0] ?? null;

        $data['reschedule_message'] = $includeMessages
            && $latestReschedule !== null
            && $latestReschedule['previous_start'] !== null
            && $latestReschedule['new_start'] !== null
            ? AppointmentRequest::buildRescheduleMessage(
                $appointment->patient_name,
                $latestReschedule['previous_start'],
                $latestReschedule['new_start'],
            )
            : null;

        return $data;
    }

    /**
     * Referencia ligera al paquete, pensada para la agenda y los listados.
     *
     * @return array<string, mixed>
     */
    private static function packageReference(ServicePackage $package, AppointmentRequest $appointment): array
    {
        return [
            'id' => $package->id,
            'service' => $package->service,
            'sessions_count' => $package->sessions_count,
            'session_number' => $appointment->package_session_number,
            'total_value_cents' => $package->total_value_cents,
            'total_paid_cents' => $package->totalPaidCents(),
            'balance_cents' => $package->balanceCents(),
            'payment_status' => $package->paymentStatus(),
            'url' => route('admin.packages.show', $package),
        ];
    }

    /**
     * Detalle completo de un paquete de sesiones.
     *
     * @return array<string, mixed>
     */
    public static function packageSummary(ServicePackage $package, bool $includeSessions = true): array
    {
        $package->loadMissing([
            'patient',
            'appointments',
            'payments.recorder:id,name',
            'payments.voider:id,name',
            'creator:id,name',
        ]);

        $counts = $package->sessionCounts();

        return [
            'id' => $package->id,
            'patient' => $package->patient !== null ? self::patientSummary($package->patient) : null,
            'service' => $package->service,
            'sessions_count' => (int) $package->sessions_count,
            'duration_minutes' => (int) $package->duration_minutes,
            'total_value_cents' => (int) $package->total_value_cents,
            'total_paid_cents' => $package->totalPaidCents(),
            'balance_cents' => $package->balanceCents(),
            'payment_status' => $package->paymentStatus(),
            'notes' => $package->notes,
            'created_at' => $package->created_at?->toDateTimeString(),
            'created_by_name' => $package->relationLoaded('creator') ? $package->creator?->name : null,
            'counts' => $counts,
            'sessions' => $includeSessions
                ? $package->appointments
                    ->map(fn (AppointmentRequest $session) => self::packageSession($session))
                    ->values()
                    ->all()
                : [],
            'payments' => $package->payments
                ->sortBy([['paid_on', 'asc'], ['id', 'asc']])
                ->values()
                ->map(fn (Payment $payment) => self::payment($payment))
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function packageSession(AppointmentRequest $session): array
    {
        return [
            'id' => $session->id,
            'number' => $session->package_session_number,
            'patient_name' => $session->patient_name,
            'status' => $session->status,
            'duration_minutes' => $session->duration_minutes,
            'confirmed_start' => $session->confirmed_start?->toDateTimeString(),
            'confirmed_end' => $session->confirmed_end?->toDateTimeString(),
            'attended_at' => $session->attended_at?->toDateTimeString(),
            'cancelled_at' => $session->cancelled_at?->toDateTimeString(),
            'no_show_at' => $session->no_show_at?->toDateTimeString(),
            'can_reschedule' => $session->isReschedulable(),
            'url' => route('admin.requests.show', $session),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function reschedule(AppointmentReschedule $reschedule): array
    {
        return [
            'id' => $reschedule->id,
            'previous_start' => $reschedule->previous_start?->toDateTimeString(),
            'previous_end' => $reschedule->previous_end?->toDateTimeString(),
            'new_start' => $reschedule->new_start?->toDateTimeString(),
            'new_end' => $reschedule->new_end?->toDateTimeString(),
            'reason' => $reschedule->reason,
            'rescheduled_at' => $reschedule->created_at?->toDateTimeString(),
            'rescheduled_by_name' => $reschedule->relationLoaded('rescheduledBy')
                ? $reschedule->rescheduledBy?->name
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function payment(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'appointment_id' => $payment->appointment_id,
            'package_id' => $payment->package_id,
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
