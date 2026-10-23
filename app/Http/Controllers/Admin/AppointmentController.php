<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignPatientRequest;
use App\Http\Requests\Admin\MarkAppointmentAttendedRequest;
use App\Http\Requests\Admin\StoreManualAppointmentRequest;
use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Services\AvailabilityService;
use App\Services\PatientService;
use App\Services\PaymentService;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly PatientService $patients,
        private readonly PaymentService $payments,
    ) {}

    /**
     * Crea una cita manual (teléfono, presencial o cualquier canal externo).
     * La cita queda confirmada y ocupa el horario en la misma agenda que las
     * solicitudes provenientes del sitio web.
     */
    public function store(StoreManualAppointmentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $startAt = Carbon::parse($validated['date'].' '.$validated['start_time']);

        if ($startAt->lessThan(now()->startOfMinute())) {
            throw ValidationException::withMessages([
                'start_time' => 'La hora de la cita ya pasó. Selecciona un horario futuro.',
            ]);
        }

        $duration = (int) $validated['duration_minutes'];
        $endAt = (clone $startAt)->addMinutes($duration);
        $serviceValueCents = Money::toCents($validated['service_value']);
        $service = $validated['service'] === AppointmentRequest::OTHER_SERVICE
            ? $validated['custom_service']
            : $validated['service'];

        if ($serviceValueCents === null || $serviceValueCents <= 0) {
            throw ValidationException::withMessages([
                'service_value' => 'Escribe el valor acordado del servicio.',
            ]);
        }

        if (! $this->availability->isSlotAvailable($startAt->format('Y-m-d H:i:s'), $duration)) {
            throw ValidationException::withMessages([
                'start_time' => 'Ese horario no está disponible según tu jornada, bloqueos o citas existentes. Elige otro espacio.',
            ]);
        }

        $appointment = DB::transaction(function () use ($validated, $startAt, $endAt, $duration, $service, $serviceValueCents) {
            /*
                Se repite la comprobación dentro de la transacción y se bloquean
                las filas en conflicto para impedir que dos citas simultáneas
                reserven el mismo espacio.
            */
            $conflict = AppointmentRequest::query()
                ->occupying()
                ->where('confirmed_start', '<', $endAt)
                ->where('confirmed_end', '>', $startAt)
                ->lockForUpdate()
                ->exists();

            if ($conflict || ! $this->availability->isSlotAvailable($startAt->format('Y-m-d H:i:s'), $duration)) {
                throw ValidationException::withMessages([
                    'start_time' => 'Ese horario acaba de ser ocupado. Elige otro espacio.',
                ]);
            }

            if ($validated['patient_mode'] === 'existing') {
                /** @var Patient $patient */
                $patient = Patient::query()
                    ->lockForUpdate()
                    ->findOrFail((int) $validated['patient_id']);
            } else {
                $patient = $this->patients->create(
                    $validated['patient_name'],
                    $validated['patient_phone'],
                    (bool) ($validated['patient_allow_duplicate_phone'] ?? false),
                );
            }

            return AppointmentRequest::create([
                'patient_id' => $patient->id,
                'patient_name' => $patient->name,
                'patient_phone' => $patient->phone,
                'service' => $service,
                'status' => AppointmentRequest::STATUS_CONFIRMED,
                'source' => AppointmentRequest::SOURCE_MANUAL,
                'duration_minutes' => $duration,
                'service_value_cents' => $serviceValueCents,
                'confirmed_start' => $startAt->format('Y-m-d H:i:s'),
                'confirmed_end' => $endAt->format('Y-m-d H:i:s'),
                'notes' => $validated['notes'] !== null && $validated['notes'] !== ''
                    ? $validated['notes']
                    : null,
            ]);
        });

        return redirect()
            ->route('admin.requests.show', $appointment)
            ->with('flash', [
                'type' => 'success',
                'message' => 'Cita creada y reservada en la agenda.',
            ]);
    }

    /**
     * Marca una cita como atendida. El pago es opcional: si no se registra
     * ahora, la cita queda atendida con saldo pendiente.
     */
    public function markAttended(MarkAppointmentAttendedRequest $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $appointment, $request) {
            $locked = AppointmentRequest::query()
                ->whereKey($appointment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== AppointmentRequest::STATUS_CONFIRMED) {
                throw ValidationException::withMessages([
                    'status' => 'Solo una cita confirmada puede marcarse como atendida.',
                ]);
            }

            $locked->update([
                'status' => AppointmentRequest::STATUS_ATTENDED,
                'attended_at' => now(),
            ]);

            if ((bool) $validated['register_payment']) {
                $amountCents = Money::toCents($validated['payment_amount']);

                if ($amountCents === null || $amountCents <= 0) {
                    throw ValidationException::withMessages([
                        'payment_amount' => 'Escribe un importe válido para el pago recibido.',
                    ]);
                }

                $this->payments->recordLocked($locked, [
                    'amount_cents' => $amountCents,
                    'paid_on' => $validated['payment_paid_on'],
                    'method' => $validated['payment_method'] ?? null,
                    'notes' => $validated['payment_notes'] ?? null,
                    'idempotency_key' => $validated['payment_idempotency_key'] ?? null,
                ], $request->user());
            }
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Cita marcada como atendida.',
        ]);
    }

    /**
     * Marca una cita como no realizada sin borrar su historial.
     */
    public function markNoShow(AppointmentRequest $appointment): RedirectResponse
    {
        DB::transaction(function () use ($appointment) {
            $locked = AppointmentRequest::query()
                ->whereKey($appointment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== AppointmentRequest::STATUS_CONFIRMED) {
                throw ValidationException::withMessages([
                    'status' => 'Solo una cita confirmada puede marcarse como no realizada.',
                ]);
            }

            $locked->update([
                'status' => AppointmentRequest::STATUS_NO_SHOW,
                'no_show_at' => now(),
            ]);
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Cita marcada como no realizada.',
        ]);
    }

    /**
     * Vincula una solicitud pública con un paciente existente o crea el
     * registro del paciente. No fusiona registros automáticamente.
     */
    public function assignPatient(AssignPatientRequest $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $appointment) {
            $locked = AppointmentRequest::query()
                ->whereKey($appointment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (! empty($validated['patient_id'])) {
                $patient = Patient::query()->findOrFail((int) $validated['patient_id']);
            } else {
                $patient = $this->patients->create(
                    $validated['patient_name'],
                    $validated['patient_phone'],
                    (bool) ($validated['allow_duplicate_phone'] ?? false),
                );
            }

            $locked->update([
                'patient_id' => $patient->id,
                'patient_name' => $patient->name,
                'patient_phone' => $patient->phone ?? $locked->patient_phone,
            ]);
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Paciente vinculado a la cita.',
        ]);
    }
}
