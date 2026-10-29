<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignPatientRequest;
use App\Http\Requests\Admin\MarkAppointmentAttendedRequest;
use App\Http\Requests\Admin\RescheduleAppointmentRequest;
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
     * Reprograma una cita confirmada conservando su paciente, pagos, notas y
     * estado. El horario anterior se libera y el nuevo se reserva en la misma
     * transacción, dejando un registro permanente del cambio.
     */
    public function reschedule(RescheduleAppointmentRequest $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validated();

        $startAt = Carbon::parse($validated['date'].' '.$validated['start_time']);
        $duration = (int) $validated['duration_minutes'];
        $endAt = (clone $startAt)->addMinutes($duration);

        if ($startAt->lessThan(now()->startOfMinute())) {
            throw ValidationException::withMessages([
                'start_time' => 'La nueva hora de la cita ya pasó. Selecciona un horario futuro.',
            ]);
        }

        $newStartLabel = $startAt->locale('es')->translatedFormat('l, j \d\e F \d\e Y \a \l\a\s g:i A');

        DB::transaction(function () use ($request, $appointment, $validated, $startAt, $endAt, $duration) {
            /** @var AppointmentRequest $locked */
            $locked = AppointmentRequest::query()
                ->whereKey($appointment->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (! $locked->isReschedulable()) {
                throw ValidationException::withMessages([
                    'status' => 'Solo las citas confirmadas pueden reprogramarse. Las citas pendientes, canceladas, atendidas o no realizadas conservan su estado actual.',
                ]);
            }

            if ($locked->confirmed_start === null || $locked->confirmed_end === null) {
                throw ValidationException::withMessages([
                    'status' => 'Esta cita no tiene un horario confirmado que se pueda reprogramar.',
                ]);
            }

            // Evita guardar una reprogramación que no cambia nada y que
            // ensuciaría el historial con un registro vacío.
            if ($locked->confirmed_start->equalTo($startAt) && $locked->confirmed_end->equalTo($endAt)) {
                throw ValidationException::withMessages([
                    'start_time' => 'La cita ya está agendada en esa fecha y hora. Elige un horario diferente.',
                ]);
            }

            /*
                Se bloquean las filas en conflicto y se excluye la propia cita
                para que su horario anterior no se interprete como ocupado.
                Así dos reprogramaciones simultáneas no pueden reservar el
                mismo espacio.
            */
            $conflict = AppointmentRequest::query()
                ->occupying()
                ->whereKeyNot($locked->getKey())
                ->where('confirmed_start', '<', $endAt)
                ->where('confirmed_end', '>', $startAt)
                ->lockForUpdate()
                ->exists();

            if ($conflict) {
                throw ValidationException::withMessages([
                    'start_time' => 'El nuevo horario se cruza con otra cita confirmada. Elige un espacio diferente.',
                ]);
            }

            if (! $this->availability->isSlotAvailable($startAt->format('Y-m-d H:i:s'), $duration, $locked->getKey())) {
                throw ValidationException::withMessages([
                    'start_time' => 'El nuevo horario no está dentro de tu jornada de atención o coincide con un bloqueo de agenda. Elige otro espacio.',
                ]);
            }

            $previousStart = $locked->confirmed_start->copy();
            $previousEnd = $locked->confirmed_end->copy();

            // Solo cambia el horario y la duración. El estado, el paciente,
            // los pagos, el valor acordado y las notas permanecen intactos.
            $locked->update([
                'confirmed_start' => $startAt->format('Y-m-d H:i:s'),
                'confirmed_end' => $endAt->format('Y-m-d H:i:s'),
                'duration_minutes' => $duration,
            ]);

            $locked->reschedules()->create([
                'previous_start' => $previousStart,
                'previous_end' => $previousEnd,
                'new_start' => $startAt,
                'new_end' => $endAt,
                'reason' => $validated['reason'] !== null && $validated['reason'] !== ''
                    ? $validated['reason']
                    : null,
                'rescheduled_by' => $request->user()?->getKey(),
            ]);
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => "Cita reprogramada para el {$newStartLabel}. El horario anterior quedó liberado y el nuevo está reservado.",
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
