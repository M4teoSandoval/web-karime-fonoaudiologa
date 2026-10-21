<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Services\AvailabilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentRequestController extends Controller
{
    public function __construct(private readonly AvailabilityService $availability) {}

    /**
     * Listado de solicitudes con filtros por estado y servicio.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(AppointmentRequest::STATUSES)],
            'service' => ['nullable', Rule::in(AppointmentRequest::SERVICES)],
        ]);

        $appointments = AppointmentRequest::query()
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['service'] ?? null, fn ($query, $service) => $query->where('service', $service))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('admin/requests/index', [
            'appointments' => $appointments->getCollection()->map(fn (AppointmentRequest $appointment) => $this->present($appointment)),
            'pagination' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'total' => $appointments->total(),
            ],
            'filters' => [
                'status' => $filters['status'] ?? null,
                'service' => $filters['service'] ?? null,
            ],
            'services' => AppointmentRequest::SERVICES,
        ]);
    }

    /**
     * Detalle de una solicitud para gestionarla.
     */
    public function show(AppointmentRequest $appointment): Response
    {
        return Inertia::render('admin/requests/show', [
            'appointment' => $this->present($appointment, includeNotes: true, includeMessages: true),
            'services' => AppointmentRequest::SERVICES,
        ]);
    }

    /**
     * Actualiza duración y notas internas de la solicitud.
     */
    public function update(Request $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validate([
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $appointment->update([
            'duration_minutes' => (int) $validated['duration_minutes'],
            'notes' => $validated['notes'] !== null ? trim($validated['notes']) : null,
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Datos de la solicitud actualizados.',
        ]);
    }

    /**
     * Registra los horarios propuestos al paciente. Una propuesta no
     * bloquea el espacio: solo la confirmación reserva el horario.
     */
    public function propose(Request $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validate([
            'slots' => ['required', 'array', 'min:1', 'max:5'],
            'slots.*' => ['required', 'date'],
        ]);

        $slots = [];

        foreach ($validated['slots'] as $start) {
            $startAt = Carbon::parse($start);

            // Se clona la fecha porque Carbon muta la instancia original: sin
            // el clon, $startAt quedaría desplazado a la hora de fin y se
            // guardarían (y validarían) horarios equivocados.
            $endAt = (clone $startAt)->addMinutes($appointment->duration_minutes);

            if (! $this->availability->isSlotAvailable($startAt->format('Y-m-d H:i:s'), $appointment->duration_minutes, $appointment->id)) {
                return back()->with('flash', [
                    'type' => 'error',
                    'message' => "El horario {$startAt->format('d/m/Y h:i A')} ya no está disponible. Selecciona otro espacio.",
                ]);
            }

            $slots[] = [
                'start' => $startAt->format('Y-m-d H:i:s'),
                'end' => $endAt->format('Y-m-d H:i:s'),
            ];
        }

        $appointment->update([
            'proposed_slots' => $slots,
            'status' => $appointment->status === AppointmentRequest::STATUS_CONFIRMED
                ? AppointmentRequest::STATUS_CONFIRMED
                : AppointmentRequest::STATUS_SLOTS_PROPOSED,
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Horarios propuestos guardados. Ya puedes revisar y copiar el mensaje para el paciente.',
        ]);
    }

    /**
     * Confirma un horario definitivo. Vuelve a validar la disponibilidad
     * dentro de una transacción para impedir doble ocupación.
     */
    public function confirm(Request $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validate([
            'start' => ['required', 'date'],
        ]);

        $startAt = Carbon::parse($validated['start']);
        $endAt = (clone $startAt)->addMinutes($appointment->duration_minutes);

        $confirmed = DB::transaction(function () use ($appointment, $startAt, $endAt) {
            // Bloquea las filas en conflicto para evitar condiciones de carrera
            // entre dos confirmaciones simultáneas.
            $conflict = AppointmentRequest::query()
                ->occupying()
                ->whereKeyNot($appointment->id)
                ->where('confirmed_start', '<', $endAt)
                ->where('confirmed_end', '>', $startAt)
                ->lockForUpdate()
                ->exists();

            $stillAvailable = $this->availability->isSlotAvailable(
                $startAt->format('Y-m-d H:i:s'),
                $appointment->duration_minutes,
                $appointment->id,
            );

            if ($conflict || ! $stillAvailable) {
                return false;
            }

            $appointment->update([
                'confirmed_start' => $startAt->format('Y-m-d H:i:s'),
                'confirmed_end' => $endAt->format('Y-m-d H:i:s'),
                'status' => AppointmentRequest::STATUS_CONFIRMED,
            ]);

            return true;
        });

        if (! $confirmed) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Ese horario acaba de ser ocupado por otra cita. Selecciona un espacio diferente.',
            ]);
        }

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Cita confirmada. El horario quedó reservado en tu agenda.',
        ]);
    }

    /**
     * Cancela una solicitud o cita confirmada.
     */
    public function cancel(AppointmentRequest $appointment): RedirectResponse
    {
        if ($appointment->status === AppointmentRequest::STATUS_CANCELLED) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'La solicitud ya estaba cancelada.',
            ]);
        }

        $appointment->update([
            'status' => AppointmentRequest::STATUS_CANCELLED,
            'proposed_slots' => null,
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'La solicitud fue cancelada. El horario (si existía) queda liberado.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(AppointmentRequest $appointment, bool $includeNotes = false, bool $includeMessages = false): array
    {
        return [
            'id' => $appointment->id,
            'patient_name' => $appointment->patient_name,
            'service' => $appointment->service,
            'status' => $appointment->status,
            'duration_minutes' => $appointment->duration_minutes,
            'proposed_slots' => $appointment->proposed_slots,
            'confirmed_start' => $appointment->confirmed_start?->toDateTimeString(),
            'confirmed_end' => $appointment->confirmed_end?->toDateTimeString(),
            'notes' => $includeNotes ? $appointment->notes : null,
            'created_at' => $appointment->created_at?->toDateTimeString(),
            'updated_at' => $appointment->updated_at?->toDateTimeString(),

            /*
                Mensajes listos para revisar y copiar. Se generan con los datos
                reales de la cita (nombre del paciente y horarios confirmados).
            */
            'proposal_message' => $includeMessages && $appointment->hasProposedSlots()
                ? AppointmentRequest::buildProposalMessage($appointment->patient_name, $appointment->proposed_slots ?? [])
                : null,
            'confirmation_message' => $includeMessages && $appointment->confirmed_start
                ? AppointmentRequest::buildConfirmationMessage($appointment->patient_name, $appointment->confirmed_start->toDateTimeString())
                : null,
        ];
    }
}
