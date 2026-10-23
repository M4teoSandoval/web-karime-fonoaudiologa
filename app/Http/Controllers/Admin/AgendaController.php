<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\AvailabilityBlock;
use App\Models\WorkSchedule;
use App\Support\AppointmentPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    /**
     * Vista de agenda por semana: citas confirmadas, bloques y jornada.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date'],
        ]);

        // Lunes de la semana solicitada (por defecto, la semana actual).
        $start = isset($validated['start'])
            ? Carbon::parse($validated['start'])->startOfWeek(Carbon::MONDAY)
            : Carbon::now()->startOfWeek(Carbon::MONDAY);

        $end = $start->copy()->addDays(6);

        $appointments = AppointmentRequest::query()
            ->occupying()
            ->withPaidTotal()
            ->whereBetween('confirmed_start', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->orderBy('confirmed_start')
            ->get();

        $blocks = AvailabilityBlock::query()
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('date')
            ->get();

        $schedules = WorkSchedule::query()
            ->where('is_active', true)
            ->get()
            ->groupBy('day_of_week');

        $days = [];

        for ($i = 0; $i < 7; $i++) {
            $day = $start->copy()->addDays($i);

            $daySchedules = $schedules->get((int) $day->dayOfWeek);

            $days[] = [
                'date' => $day->toDateString(),
                'day_name' => $day->locale('es')->isoFormat('dddd'),
                'day_number' => $day->format('d'),
                'intervals' => $daySchedules !== null
                    ? $daySchedules
                        ->sortBy('start_time')
                        ->values()
                        ->map(fn (WorkSchedule $schedule) => [
                            'start_time' => $schedule->start_time,
                            'end_time' => $schedule->end_time,
                        ])
                        ->all()
                    : [],
                'appointments' => $appointments
                    ->filter(fn (AppointmentRequest $appointment) => $appointment->confirmed_start?->isSameDay($day))
                    ->values()
                    ->map(fn (AppointmentRequest $appointment) => [
                        ...AppointmentPresenter::summary($appointment),
                        'start' => $appointment->confirmed_start?->format('H:i'),
                        'end' => $appointment->confirmed_end?->format('H:i'),
                    ]),
                'blocks' => $blocks
                    ->filter(fn (AvailabilityBlock $block) => $block->date?->isSameDay($day))
                    ->values()
                    ->map(fn (AvailabilityBlock $block) => [
                        'id' => $block->id,
                        'is_full_day' => $block->isFullDay(),
                        'start_time' => $block->start_time,
                        'end_time' => $block->end_time,
                        'reason' => $block->reason,
                    ]),
            ];
        }

        return Inertia::render('admin/agenda', [
            'weekStart' => $start->toDateString(),
            'previousWeekStart' => $start->copy()->subWeek()->toDateString(),
            'nextWeekStart' => $start->copy()->addWeek()->toDateString(),
            'days' => $days,
            'services' => AppointmentRequest::SERVICES,
            'otherService' => AppointmentRequest::OTHER_SERVICE,
        ]);
    }
}
