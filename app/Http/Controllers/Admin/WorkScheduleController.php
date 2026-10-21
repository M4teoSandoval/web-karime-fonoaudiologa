<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityBlock;
use App\Models\WorkSchedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WorkScheduleController extends Controller
{
    /**
     * Nombres de los días usados para los mensajes de validación.
     *
     * @var array<int, string>
     */
    private const DAY_NAMES = [
        0 => 'Domingo',
        1 => 'Lunes',
        2 => 'Martes',
        3 => 'Miércoles',
        4 => 'Jueves',
        5 => 'Viernes',
        6 => 'Sábado',
    ];

    /**
     * Página de configuración de días y horas de atención.
     */
    public function index(): Response
    {
        // Un mismo día puede tener varios intervalos (mañana y tarde).
        $rows = WorkSchedule::query()
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        $schedules = collect(range(0, 6))->map(function (int $dayOfWeek) use ($rows) {
            $dayRows = $rows->where('day_of_week', $dayOfDay = $dayOfWeek)->values();

            return [
                'day_of_week' => $dayOfWeek,
                'day_name' => self::DAY_NAMES[$dayOfWeek],
                'is_active' => $dayRows->contains('is_active', true),
                'intervals' => $dayRows
                    ->filter(fn (WorkSchedule $schedule) => $schedule->is_active)
                    ->map(fn (WorkSchedule $schedule) => [
                        'start_time' => $schedule->start_time,
                        'end_time' => $schedule->end_time,
                    ])
                    ->values(),
            ];
        });

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
     * Guarda la configuración semanal completa dentro de una transacción.
     *
     * Acepta dos formatos por día:
     *  - Nuevo: "intervals" => [['start_time' => '08:00', 'end_time' => '12:00'], ...]
     *  - Legado: "start_time" / "end_time" a nivel de día (una sola jornada).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'schedules' => ['required', 'array', 'size:7'],
            'schedules.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'schedules.*.is_active' => ['required', 'boolean'],
            'schedules.*.start_time' => ['nullable', 'date_format:H:i'],
            'schedules.*.end_time' => ['nullable', 'date_format:H:i', 'after:schedules.*.start_time'],
            'schedules.*.intervals' => ['nullable', 'array', 'max:8'],
            'schedules.*.intervals.*.start_time' => ['required', 'date_format:H:i'],
            'schedules.*.intervals.*.end_time' => ['required', 'date_format:H:i', 'after:schedules.*.intervals.*.start_time'],
        ]);

        $days = $this->normalizeDays($validated['schedules']);

        DB::transaction(function () use ($days) {
            foreach ($days as $day) {
                // Los días sin atención conservan un registro inactivo (como
                // antes) para poder mostrarlos en la interfaz.
                if (! $day['is_active'] || $day['intervals'] === []) {
                    WorkSchedule::updateOrCreate(
                        [
                            'day_of_week' => $day['day_of_week'],
                            'start_time' => $day['intervals'][0]['start_time'] ?? '08:00:00',
                        ],
                        [
                            'is_active' => false,
                            'end_time' => $day['intervals'][0]['end_time'] ?? '18:00:00',
                        ],
                    );

                    // Solo debe quedar un registro inactivo por día.
                    WorkSchedule::query()
                        ->where('day_of_week', $day['day_of_week'])
                        ->where('is_active', false)
                        ->where('start_time', '!=', ($day['intervals'][0]['start_time'] ?? '08:00:00'))
                        ->delete();

                    continue;
                }

                // Día activo: se reemplazan sus intervalos por los enviados.
                WorkSchedule::query()->where('day_of_week', $day['day_of_week'])->delete();

                foreach ($day['intervals'] as $interval) {
                    WorkSchedule::create([
                        'day_of_week' => $day['day_of_week'],
                        'start_time' => $interval['start_time'],
                        'end_time' => $interval['end_time'],
                        'is_active' => true,
                    ]);
                }
            }
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Horarios de atención guardados.',
        ]);
    }

    /**
     * Normaliza el payload (nuevo o legado) a una lista canónica de días
     * con sus intervalos, validando solapamientos y duplicados.
     *
     * @param  array<int, array<string, mixed>>  $schedules
     * @return array<int, array{day_of_week: int, is_active: bool, intervals: list<array{start_time: string, end_time: string}>}>
     */
    private function normalizeDays(array $schedules): array
    {
        $days = [];
        $errors = [];

        foreach ($schedules as $position => $day) {
            $dayOfWeek = (int) ($day['day_of_week'] ?? $position);
            $isActive = (bool) ($day['is_active'] ?? false);

            // Formato legado: una sola jornada a nivel de día.
            if (! isset($day['intervals']) || $day['intervals'] === null) {
                $day['intervals'] = isset($day['start_time'], $day['end_time'])
                    ? [['start_time' => $day['start_time'], 'end_time' => $day['end_time']]]
                    : [];
            }

            $intervals = [];

            foreach ($day['intervals'] as $interval) {
                $intervals[] = [
                    'start_time' => $this->toMinutes($interval['start_time']),
                    'end_time' => $this->toMinutes($interval['end_time']),
                ];
            }

            // Ordenar por hora de inicio para validar y guardar de forma predecible.
            usort($intervals, fn (array $a, array $b) => $a['start_time'] <=> $b['start_time']);

            if ($isActive && $intervals === []) {
                $errors["schedules.{$position}.intervals"] = 'Agrega al menos un horario para activar este día.';

                continue;
            }

            foreach ($intervals as $index => $interval) {
                if ($interval['end_time'] <= $interval['start_time']) {
                    $errors["schedules.{$position}.intervals.{$index}.end_time"] =
                        'La hora de finalización debe ser posterior a la hora de inicio.';
                }

                if ($index > 0 && $interval['start_time'] < $intervals[$index - 1]['end_time']) {
                    $errors["schedules.{$position}.intervals.{$index}.start_time"] =
                        'Los horarios no pueden solaparse ni repetirse dentro del mismo día.';
                }
            }

            $days[$dayOfWeek] = [
                'day_of_week' => $dayOfWeek,
                'is_active' => $isActive,
                'intervals' => array_map(fn (array $interval) => [
                    'start_time' => sprintf('%02d:%02d:00', intdiv($interval['start_time'], 60), $interval['start_time'] % 60),
                    'end_time' => sprintf('%02d:%02d:00', intdiv($interval['end_time'], 60), $interval['end_time'] % 60),
                ], $intervals),
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        ksort($days);

        return array_values($days);
    }

    /**
     * Convierte una hora "H:i" a minutos desde la medianoche.
     */
    private function toMinutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
    }
}
