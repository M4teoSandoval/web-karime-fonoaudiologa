<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/**
 * Genera las fechas propuestas de un paquete recurrente.
 *
 * La generación es solo una propuesta: Karime puede editar cada fecha y hora
 * antes de guardar. El backend vuelve a validar la agenda al crear el paquete.
 */
class PackageScheduleService
{
    /** Límite de días que se recorren para completar las sesiones. */
    private const MAX_DAYS_AHEAD = 730;

    /**
     * Devuelve las próximas sesiones a partir de la fecha inicial.
     *
     * @param  list<int>  $weekdays  Días de la semana (0 = domingo … 6 = sábado).
     * @return list<array{date: string, start_time: string}>
     */
    public function generate(string $startDate, string $startTime, int $count, array $weekdays): array
    {
        $days = collect($weekdays)
            ->map(fn ($day) => (int) $day)
            ->filter(fn (int $day) => $day >= 0 && $day <= 6)
            ->unique()
            ->sort()
            ->values()
            ->all();

        if ($days === []) {
            throw ValidationException::withMessages([
                'weekdays' => 'Selecciona al menos un día de la semana para generar las sesiones.',
            ]);
        }

        $cursor = CarbonImmutable::parse($startDate)->startOfDay();
        $time = substr($startTime, 0, 5);

        $sessions = [];
        $scanned = 0;

        while (count($sessions) < $count && $scanned < self::MAX_DAYS_AHEAD) {
            if (in_array((int) $cursor->dayOfWeek, $days, true)) {
                $sessions[] = [
                    'date' => $cursor->format('Y-m-d'),
                    'start_time' => $time,
                ];
            }

            $cursor = $cursor->addDay();
            $scanned++;
        }

        if (count($sessions) < $count) {
            throw ValidationException::withMessages([
                'weekdays' => 'No fue posible generar todas las sesiones con esa frecuencia. Revisa los días seleccionados.',
            ]);
        }

        return $sessions;
    }
}
