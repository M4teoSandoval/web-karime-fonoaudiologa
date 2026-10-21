<?php

namespace App\Services;

use App\Models\AppointmentRequest;
use App\Models\AvailabilityBlock;
use App\Models\WorkSchedule;
use Carbon\CarbonImmutable;

/**
 * Calcula los espacios disponibles de la agenda teniendo en cuenta:
 *  - los días y horarios de atención configurados,
 *  - las citas confirmadas,
 *  - los bloques de disponibilidad creados por Karime,
 *  - la duración de cada cita.
 *
 * Las propuestas de horario NO ocupan espacio: solo las citas confirmadas.
 */
class AvailabilityService
{
    /**
     * Intervalo mínimo en minutos entre el inicio de dos espacios propuestos.
     */
    public const SLOT_GRANULARITY_MINUTES = 15;

    /**
     * Devuelve los espacios libres para una fecha dada.
     *
     * @return list<array{start: string, end: string}> ISO 8601 en formato "Y-m-d H:i:s"
     */
    public function availableSlots(string $date, int $durationMinutes, ?int $excludeRequestId = null): array
    {
        $day = CarbonImmutable::parse($date)->startOfDay();

        if ($durationMinutes < 5 || $durationMinutes > 24 * 60) {
            return [];
        }

        // 1. Jornadas configuradas para ese día de la semana. Un mismo día
        //    puede tener varios intervalos (mañana y tarde), separados por
        //    pausas en las que no se genera disponibilidad.
        /** @var list<WorkSchedule> $intervals */
        $intervals = WorkSchedule::query()->forDay((int) $day->dayOfWeek)->get();

        if ($intervals->isEmpty()) {
            return [];
        }

        // 2. Bloqueos de Karime y citas confirmadas para ese día.
        $unavailable = array_merge($this->blockedIntervals($day), $this->busyIntervals($day, $excludeRequestId));

        // 3. Generar espacios candidatos dentro de cada intervalo y filtrar
        //    los que se solapen con bloqueos o citas.
        $slots = [];

        foreach ($intervals as $interval) {
            $intervalStart = $this->intervalBoundary($interval->start_time, $day);
            $intervalEnd = $this->intervalBoundary($interval->end_time, $day);

            if ($intervalEnd->lessThanOrEqualTo($intervalStart)) {
                continue;
            }

            $cursor = $intervalStart;
            $latestStart = $intervalEnd->subMinutes($durationMinutes);

            while ($cursor->lessThanOrEqualTo($latestStart)) {
                $slotEnd = $cursor->addMinutes($durationMinutes);

                if (! $this->overlapsAny($cursor, $slotEnd, $unavailable)) {
                    $slots[] = [
                        'start' => $cursor->format('Y-m-d H:i:s'),
                        'end' => $slotEnd->format('Y-m-d H:i:s'),
                    ];
                }

                $cursor = $cursor->addMinutes(self::SLOT_GRANULARITY_MINUTES);
            }
        }

        usort($slots, fn (array $a, array $b) => strcmp($a['start'], $b['start']));

        return $slots;
    }

    /**
     * Verifica si un horario puntual está realmente disponible.
     * La cita debe caber completa dentro de UN intervalo de trabajo:
     * nunca puede cruzar una pausa ni salirse de la jornada.
     */
    public function isSlotAvailable(string $start, int $durationMinutes, ?int $excludeRequestId = null): bool
    {
        $startAt = CarbonImmutable::parse($start);
        $endAt = $startAt->addMinutes($durationMinutes);
        $day = $startAt->startOfDay();

        /** @var list<WorkSchedule> $intervals */
        $intervals = WorkSchedule::query()->forDay((int) $day->dayOfWeek)->get();

        if ($intervals->isEmpty()) {
            return false;
        }

        $fitsInsideAnInterval = $intervals->contains(function (WorkSchedule $interval) use ($day, $startAt, $endAt) {
            $intervalStart = $this->intervalBoundary($interval->start_time, $day);
            $intervalEnd = $this->intervalBoundary($interval->end_time, $day);

            return $startAt->greaterThanOrEqualTo($intervalStart) && $endAt->lessThanOrEqualTo($intervalEnd);
        });

        if (! $fitsInsideAnInterval) {
            return false;
        }

        $unavailable = array_merge($this->blockedIntervals($day), $this->busyIntervals($day, $excludeRequestId));

        return ! $this->overlapsAny($startAt, $endAt, $unavailable);
    }

    /**
     * Combina la hora de un intervalo de trabajo con la fecha del día
     * solicitado para obtener un CarbonImmutable completo.
     */
    private function intervalBoundary(string $time, CarbonImmutable $day): CarbonImmutable
    {
        return CarbonImmutable::parse($time, $day->timezone)
            ->setDate($day->year, $day->month, $day->day);
    }

    /**
     * Intervalos bloqueados por Karime en una fecha.
     * Devuelve un único intervalo "todo el día" si existe un bloqueo completo.
     *
     * @return list<array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function blockedIntervals(CarbonImmutable $day): array
    {
        /** @var iterable<AvailabilityBlock> $blocks */
        $blocks = AvailabilityBlock::query()
            ->whereDate('date', $day->toDateString())
            ->get();

        $intervals = [];

        foreach ($blocks as $block) {
            if ($block->isFullDay()) {
                return [
                    [
                        'start' => $day->startOfDay(),
                        'end' => $day->addDay()->startOfDay(),
                    ],
                ];
            }

            $intervals[] = [
                'start' => CarbonImmutable::parse($block->start_time)->setDate($day->year, $day->month, $day->day),
                'end' => CarbonImmutable::parse($block->end_time)->setDate($day->year, $day->month, $day->day),
            ];
        }

        return $intervals;
    }

    /**
     * Intervalos ocupados por citas confirmadas en una fecha.
     *
     * @return list<array{start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function busyIntervals(CarbonImmutable $day, ?int $excludeRequestId = null): array
    {
        $appointments = AppointmentRequest::query()
            ->occupying()
            ->when($excludeRequestId !== null, fn ($query) => $query->whereKeyNot($excludeRequestId))
            ->whereDate('confirmed_start', $day->toDateString())
            ->get(['id', 'confirmed_start', 'confirmed_end']);

        return $appointments
            ->map(fn (AppointmentRequest $appointment) => [
                'start' => CarbonImmutable::parse($appointment->confirmed_start),
                'end' => CarbonImmutable::parse($appointment->confirmed_end),
            ])
            ->all();
    }

    /**
     * Detecta solapamiento entre un intervalo y una lista de intervalos.
     *
     * @param  list<array{start: CarbonImmutable, end: CarbonImmutable}>  $intervals
     */
    private function overlapsAny(CarbonImmutable $start, CarbonImmutable $end, array $intervals): bool
    {
        foreach ($intervals as $interval) {
            if ($start->lessThan($interval['end']) && $end->greaterThan($interval['start'])) {
                return true;
            }
        }

        return false;
    }
}
