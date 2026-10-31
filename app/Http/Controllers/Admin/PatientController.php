<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePatientRequest;
use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\PatientNote;
use App\Models\Payment;
use App\Models\ServicePackage;
use App\Support\AppointmentPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    /**
     * Listado paginado de pacientes con búsqueda por nombre o teléfono.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $patients = Patient::query()
            ->search($filters['q'] ?? null)
            ->withCount('appointments as appointments_count')
            ->withMax('appointments as last_appointment_at', 'confirmed_start')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/patients/index', [
            'patients' => $patients->getCollection()->map(fn (Patient $patient) => [
                ...AppointmentPresenter::patientSummary($patient),
                'appointments_count' => (int) $patient->appointments_count,
                'last_appointment_at' => $patient->last_appointment_at,
                'total_paid_cents' => $this->totalPaidCents($patient),
                'outstanding_cents' => $this->outstandingCents($patient),
            ]),
            'pagination' => [
                'current_page' => $patients->currentPage(),
                'last_page' => $patients->lastPage(),
                'total' => $patients->total(),
            ],
            'filters' => [
                'q' => $filters['q'] ?? null,
            ],
        ]);
    }

    /**
     * Perfil del paciente: historial de citas, pagos y notas privadas.
     */
    public function show(Patient $patient): Response
    {
        $appointments = $patient->appointments()
            ->with([
                'package.payments',
                'payments' => fn ($query) => $query
                    ->with(['recorder:id,name', 'voider:id,name'])
                    ->orderBy('paid_on')
                    ->orderBy('id'),
            ])
            ->withPaidTotal()
            ->orderByRaw('COALESCE(confirmed_start, created_at) DESC')
            ->get();

        $packages = $patient->packages()
            ->with([
                'patient',
                'appointments',
                'payments.recorder:id,name',
                'payments.voider:id,name',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $payments = Payment::query()
            ->whereHas('appointment', fn (Builder $query) => $query->where('patient_id', $patient->id))
            ->with([
                'recorder:id,name',
                'voider:id,name',
                'appointment:id,service,confirmed_start,patient_name',
                'package:id,service,sessions_count',
            ])
            ->orderByDesc('paid_on')
            ->orderByDesc('id')
            ->get();

        $notes = $patient->notes()
            ->with([
                'appointment:id,service,confirmed_start,patient_name',
                'author:id,name',
                'revisions.editor:id,name',
            ])
            ->orderByDesc('noted_at')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('admin/patients/show', [
            'patient' => AppointmentPresenter::patientSummary($patient),
            'summary' => [
                'appointments_count' => $appointments->count(),
                'attended_count' => $appointments->where('status', AppointmentRequest::STATUS_ATTENDED)->count(),
                'total_paid_cents' => $this->totalPaidCents($patient),
                'outstanding_cents' => $this->outstandingCents($patient),
                'last_appointment_at' => $appointments->first()?->confirmed_start?->toDateTimeString(),
            ],
            'appointments' => $appointments
                ->map(fn (AppointmentRequest $appointment) => AppointmentPresenter::detail($appointment, includeMessages: false))
                ->values(),
            'packages' => $packages
                ->map(fn (ServicePackage $package) => AppointmentPresenter::packageSummary($package, includeSessions: false))
                ->values(),
            'payments' => $payments->map(function (Payment $payment) {
                $data = AppointmentPresenter::payment($payment);
                $data['appointment'] = $payment->appointment !== null
                    ? [
                        'id' => $payment->appointment->id,
                        'service' => $payment->appointment->service,
                        'confirmed_start' => $payment->appointment->confirmed_start?->toDateTimeString(),
                        'patient_name' => $payment->appointment->patient_name,
                    ]
                    : null;
                $data['package'] = $payment->package !== null
                    ? [
                        'id' => $payment->package->id,
                        'service' => $payment->package->service,
                        'sessions_count' => (int) $payment->package->sessions_count,
                    ]
                    : null;

                return $data;
            })->values(),
            'notes' => $notes->map(fn (PatientNote $note) => [
                'id' => $note->id,
                'body' => $note->body,
                'noted_at' => $note->noted_at?->toDateString(),
                'created_at' => $note->created_at?->toDateTimeString(),
                'updated_at' => $note->updated_at?->toDateTimeString(),
                'author_name' => $note->author?->name,
                'appointment' => $note->appointment !== null
                    ? [
                        'id' => $note->appointment->id,
                        'service' => $note->appointment->service,
                        'confirmed_start' => $note->appointment->confirmed_start?->toDateTimeString(),
                    ]
                    : null,
                'revisions' => $note->revisions->map(fn ($revision) => [
                    'id' => $revision->id,
                    'body' => $revision->body,
                    'edited_by_name' => $revision->editor?->name,
                    'created_at' => $revision->created_at?->toDateTimeString(),
                ])->values(),
            ])->values(),
        ]);
    }

    /**
     * Corrige nombre y teléfono sin perder el historial. Las citas vinculadas
     * reciben los datos corregidos del paciente.
     */
    public function update(UpdatePatientRequest $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validated();
        $normalized = Patient::normalizePhone($validated['phone']);

        if ($normalized === null || strlen($normalized) < 7) {
            throw ValidationException::withMessages([
                'phone' => 'Escribe un teléfono válido (al menos 7 dígitos).',
            ]);
        }

        DB::transaction(function () use ($patient, $validated, $normalized) {
            $locked = Patient::query()
                ->whereKey($patient->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $locked->update([
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'phone_normalized' => $normalized,
            ]);

            // Corrección de datos de contacto en las citas del paciente. No
            // altera importes, estados, pagos ni notas.
            $locked->appointments()->update([
                'patient_name' => $validated['name'],
                'patient_phone' => $validated['phone'],
            ]);
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Datos del paciente actualizados.',
        ]);
    }

    /**
     * Búsqueda JSON para seleccionar un paciente al crear o vincular citas.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $term = trim((string) ($validated['q'] ?? ''));
        $digits = Patient::normalizePhone($term);

        if (mb_strlen($term) < 2 && ($digits === null || strlen($digits) < 3)) {
            return response()->json(['patients' => []]);
        }

        $patients = Patient::query()
            ->search($term)
            ->withCount('appointments as appointments_count')
            ->withMax('appointments as last_appointment_at', 'confirmed_start')
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json([
            'patients' => $patients->map(fn (Patient $patient) => [
                ...AppointmentPresenter::patientSummary($patient),
                'appointments_count' => (int) $patient->appointments_count,
                'last_appointment_at' => $patient->last_appointment_at,
            ])->values(),
        ]);
    }

    private function totalPaidCents(Patient $patient): int
    {
        return (int) Payment::query()
            ->whereHas('appointment', fn (Builder $query) => $query->where('patient_id', $patient->id))
            ->whereNull('voided_at')
            ->sum('amount_cents');
    }

    private function outstandingCents(Patient $patient): int
    {
        $appointmentsOutstanding = (int) $patient->appointments()
            ->chargeable()
            ->whereNotNull('service_value_cents')
            ->withPaidTotal()
            ->get()
            ->sum(fn (AppointmentRequest $appointment) => max(
                0,
                (int) $appointment->service_value_cents - $appointment->totalPaidCents(),
            ));

        // Las sesiones de un paquete no tienen valor propio: su saldo se suma
        // una sola vez desde el paquete para no duplicar el pendiente.
        $packagesOutstanding = (int) $patient->packages()
            ->withPaidTotal()
            ->get()
            ->sum(fn (ServicePackage $package) => $package->balanceCents());

        return $appointmentsOutstanding + $packagesOutstanding;
    }
}
