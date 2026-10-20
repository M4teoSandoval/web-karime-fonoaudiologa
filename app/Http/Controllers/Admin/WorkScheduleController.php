<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityBlock;
use App\Models\WorkSchedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WorkScheduleController extends Controller
{
    /**
     * Página de configuración de días y horas de atención.
     */
    public function index(): Response
    {
        $schedules = WorkSchedule::query()
            ->orderBy('day_of_week')
            ->get()
            ->map(fn (WorkSchedule $schedule) => [
                'id' => $schedule->id,
                'day_of_week' => $schedule->day_of_week,
                'day_name' => $schedule->dayName(),
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'is_active' => $schedule->is_active,
            ]);

        $blocks = AvailabilityBlock::query()
            ->whereDate('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->limit(30)
            ->get()
            ->map(fn (AvailabilityBlock $block) => [
                'id' => $block->id,
                'date' => $block->date->toDateString(),
                'is_full_day' => $block->isFullDay(),
                'start_time' => $block->start_time,
                'end_time' => $block->end_time,
                'reason' => $block->reason,
            ]);

        return Inertia::render('admin/schedule', [
            'schedules' => $schedules,
            'blocks' => $blocks,
        ]);
    }

    /**
     * Guarda la configuración semanal completa (upsert por día).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'schedules' => ['required', 'array', 'size:7'],
            'schedules.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'schedules.*.is_active' => ['required', 'boolean'],
            'schedules.*.start_time' => ['required_unless:schedules.*.is_active,false', 'nullable', 'date_format:H:i'],
            'schedules.*.end_time' => [
                'required_unless:schedules.*.is_active,false',
                'nullable',
                'date_format:H:i',
                'after:schedules.*.start_time',
            ],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['schedules'] as $day) {
                WorkSchedule::updateOrCreate(
                    ['day_of_week' => (int) $day['day_of_week']],
                    [
                        'is_active' => (bool) $day['is_active'],
                        'start_time' => $day['start_time'] ?? '08:00',
                        'end_time' => $day['end_time'] ?? '18:00',
                    ],
                );
            }
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Horarios de atención guardados.',
        ]);
    }
}
