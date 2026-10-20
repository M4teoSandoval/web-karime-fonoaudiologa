<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\WorkSchedule;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Resumen del panel: solicitudes pendientes, próximas citas y estado general.
     */
    public function index(): Response
    {
        $counts = AppointmentRequest::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $upcoming = AppointmentRequest::query()
            ->occupying()
            ->where('confirmed_start', '>=', Carbon::now())
            ->orderBy('confirmed_start')
            ->limit(5)
            ->get();

        $recent = AppointmentRequest::query()
            ->whereIn('status', [AppointmentRequest::STATUS_PENDING, AppointmentRequest::STATUS_SLOTS_PROPOSED])
            ->latest()
            ->limit(6)
            ->get();

        $hasSchedules = WorkSchedule::query()->where('is_active', true)->exists();

        return Inertia::render('admin/dashboard', [
            'counts' => [
                'pending' => $counts[AppointmentRequest::STATUS_PENDING] ?? 0,
                'slots_proposed' => $counts[AppointmentRequest::STATUS_SLOTS_PROPOSED] ?? 0,
                'confirmed' => $counts[AppointmentRequest::STATUS_CONFIRMED] ?? 0,
                'cancelled' => $counts[AppointmentRequest::STATUS_CANCELLED] ?? 0,
            ],
            'upcoming' => $upcoming->map(
                fn(AppointmentRequest $appointment) => $this->presentAppointment($appointment)
            ),
            'recent' => $recent->map(
                fn(AppointmentRequest $appointment) => $this->presentAppointment($appointment)
            ),
            'hasSchedules' => $hasSchedules,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentAppointment(AppointmentRequest $appointment): array
    {
        return [
            'id' => $appointment->id,
            'patient_name' => $appointment->patient_name,
            'service' => $appointment->service,
            'status' => $appointment->status,
            'duration_minutes' => $appointment->duration_minutes,
            'confirmed_start' => $appointment->confirmed_start?->toDateTimeString(),
            'confirmed_end' => $appointment->confirmed_end?->toDateTimeString(),
            'created_at' => $appointment->created_at?->toDateTimeString(),
        ];
    }
}
