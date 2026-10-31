<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PreviewPackageScheduleRequest;
use App\Http\Requests\Admin\StoreAppointmentPackageRequest;
use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\ServicePackage;
use App\Services\AvailabilityService;
use App\Services\PackageScheduleService;
use App\Services\PatientService;
use App\Services\PaymentService;
use App\Support\AppointmentPresenter;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentPackageController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly PackageScheduleService $schedule,
        private readonly PatientService $patients,
        private readonly PaymentService $payments,
    ) {}

    /**
     * Detalle del paquete: sesiones, avance y pagos.
     */
    public function show(ServicePackage $package): Response
    {
        $package->load([
            'patient',
            'creator:id,name',
            'appointments',
            'payments' => fn ($query) => $query->orderBy('paid_on')->orderBy('id'),
            'payments.recorder:id,name',
            'payments.voider:id,name',
        ]);

        return Inertia::render('admin/packages/show', [
            'package' => AppointmentPresenter::packageSummary($package),
        ]);
    }

    /**
     * Propone las fechas de un paquete recurrente sin crear nada. Karime puede
     * editar cada fecha y hora antes de confirmar la creación.
     */
    public function preview(PreviewPackageScheduleRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $sessions = $this->schedule->generate(
            $validated['start_date'],
            $validated['start_time'],
            (int) $validated['sessions_count'],
            $validated['weekdays'],
        );

        return response()->json(['sessions' => $sessions]);
    }

    /**
     * Crea un paquete completo de sesiones para un mismo paciente.
     *
     * La operación es atómica: se validan todas las sesiones (jornada,
     * bloqueos, citas existentes y cruces internos) antes de crear la primera.
     * Si una sola sesión falla, no se guarda nada.
     */
    public function store(StoreAppointmentPackageRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $duration = (int) $validated['duration_minutes'];
        $totalCents = Money::toCents($validated['total_value']);
        $service = $validated['service'] === AppointmentRequest::OTHER_SERVICE
            ? $validated['custom_service']
            : $validated['service'];

        if ($totalCents === null || $totalCents <= 0) {
            throw ValidationException::withMessages([
                'total_value' => 'Escribe el valor total acordado del paquete.',
            ]);
        }

        $package = DB::transaction(function () use ($request, $validated, $duration, $totalCents, $service) {
            $patient = $this->resolvePatient($validated);

            /** @var list<array{number:int, start:Carbon, end:Carbon}> $sessions */
            $sessions = [];
            $now = now()->startOfMinute();

            foreach ($validated['sessions'] as $index => $session) {
                $number = $index + 1;
                $startAt = Carbon::parse($session['date'].' '.$session['start_time']);
                $endAt = (clone $startAt)->addMinutes($duration);

                if ($startAt->lessThan($now)) {
                    throw ValidationException::withMessages([
                        "sessions.{$index}.start_time" => "La sesión {$number} ya pasó. Selecciona una fecha y hora futuras.",
                    ]);
                }

                // Cruces entre las propias sesiones del paquete.
                foreach ($sessions as $previous) {
                    if ($startAt->lessThan($previous['end']) && $endAt->greaterThan($previous['start'])) {
                        throw ValidationException::withMessages([
                            "sessions.{$index}.start_time" => "La sesión {$number} se cruza con la sesión {$previous['number']} del mismo paquete. Ajusta uno de los dos horarios.",
                        ]);
                    }
                }

                // Cruces con citas ya confirmadas en la agenda. Se bloquean las
                // filas en conflicto para evitar reservas simultáneas.
                $conflict = AppointmentRequest::query()
                    ->occupying()
                    ->where('confirmed_start', '<', $endAt)
                    ->where('confirmed_end', '>', $startAt)
                    ->lockForUpdate()
                    ->exists();

                if ($conflict) {
                    throw ValidationException::withMessages([
                        "sessions.{$index}.start_time" => "La sesión {$number} se cruza con otra cita ya confirmada. Elige otro horario.",
                    ]);
                }

                if (! $this->availability->isSlotAvailable($startAt->format('Y-m-d H:i:s'), $duration)) {
                    throw ValidationException::withMessages([
                        "sessions.{$index}.start_time" => "La sesión {$number} no está dentro de tu jornada de atención o coincide con un bloqueo de agenda. Elige otro horario.",
                    ]);
                }

                $sessions[] = [
                    'number' => $number,
                    'start' => $startAt,
                    'end' => $endAt,
                ];
            }

            $package = ServicePackage::create([
                'patient_id' => $patient->id,
                'service' => $service,
                'sessions_count' => (int) $validated['sessions_count'],
                'duration_minutes' => $duration,
                'total_value_cents' => $totalCents,
                'notes' => ($validated['notes'] ?? null) !== null && $validated['notes'] !== ''
                    ? $validated['notes']
                    : null,
                'created_by' => $request->user()?->getKey(),
            ]);

            $created = [];

            foreach ($sessions as $session) {
                $created[] = AppointmentRequest::create([
                    'patient_id' => $patient->id,
                    'package_id' => $package->id,
                    'package_session_number' => $session['number'],
                    'patient_name' => $patient->name,
                    'patient_phone' => $patient->phone,
                    'service' => $service,
                    'status' => AppointmentRequest::STATUS_CONFIRMED,
                    'source' => AppointmentRequest::SOURCE_MANUAL,
                    'duration_minutes' => $duration,
                    // El valor y el saldo se gestionan desde el paquete.
                    'service_value_cents' => null,
                    'confirmed_start' => $session['start']->format('Y-m-d H:i:s'),
                    'confirmed_end' => $session['end']->format('Y-m-d H:i:s'),
                ]);
            }

            $initialPayment = Money::toCents($validated['initial_payment'] ?? null);

            if ($initialPayment !== null && $initialPayment > 0) {
                $this->payments->recordPackageLocked($package, $created[0], [
                    'amount_cents' => $initialPayment,
                    'paid_on' => $validated['initial_payment_on'],
                    'method' => $validated['initial_payment_method'] ?? null,
                    'notes' => $validated['initial_payment_notes'] ?? null,
                    'idempotency_key' => $validated['initial_payment_idempotency_key'] ?? null,
                ], $request->user());
            }

            return $package;
        });

        return redirect()
            ->route('admin.packages.show', $package)
            ->with('flash', [
                'type' => 'success',
                'message' => "Paquete de {$package->sessions_count} sesiones creado. Todas las citas quedaron reservadas en la agenda.",
            ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolvePatient(array $validated): Patient
    {
        if ($validated['patient_mode'] === 'existing') {
            /** @var Patient $patient */
            $patient = Patient::query()
                ->lockForUpdate()
                ->findOrFail((int) $validated['patient_id']);

            return $patient;
        }

        return $this->patients->create(
            $validated['patient_name'],
            $validated['patient_phone'],
            (bool) ($validated['patient_allow_duplicate_phone'] ?? false),
        );
    }
}
