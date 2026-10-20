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

        // 1. Jornada habitual de ese día de la semana.
        /** @var WorkSchedule|null $schedule */
        $schedule = WorkSchedule::query()
            ->where('day_of_week', (int) $day->dayOfWeek)
            ->where('is_active', true)
            ->first();

        if ($schedule === null) {
            return [];
        }

        $dayStart = CarbonImmutable::parse($schedule->start_time, $day->timezone)->setDate($day->year, $day->month, $day->day);
        $dayEnd = CarbonImmutable::parse($schedule->end_time, $day->timezone)->setDate($day->year, $day->month, $day->day);

        if (! $dayEnd->isAfter($dayStart)) {
            return [];
        }

        // 2. Bloqueos de Karime para ese día.
        $blockedTimes = $this->blockedIntervals($day);

        // 3. Citas confirmadas que ocupan ese día.
        $busyTimes = $this->busyIntervals($day, $excludeRequestId);

        $intervals = array_merge($blockedTimes, $busyTimes);

        // 4. Generar espacios candidatos y filtrar los superpuestos.
        $slots = [];
        $cursor = $dayStart;
        $latestStart = $dayEnd->subMinutes($durationMinutes);

        while ($cursor->lessThanOrEqualTo($latestStart)) {
            $slotEnd = $cursor->addMinutes($durationMinutes);

            if (! $this->overlapsAny($cursor, $slotEnd, $intervals)) {
                $slots[] = [
                    'start' => $cursor->format('Y-m-d H:i:s'),
                    'end' => $slotEnd->format('Y-m-d H:i:s'),
                ];
            }

            $cursor = $cursor->addMinutes(self::SLOT_GRANULARITY_MINUTES);
        }

        return $slots;
    }

    /**
     * Verifica si un horario puntual está realmente disponible.
     */
    public function isSlotAvailable(string $start, int $durationMinutes, ?int $excludeRequestId = null): bool
    {
        $startAt = CarbonImmutable::parse($start);
        $endAt = $startAt->addMinutes($durationMinutes);
        $day = $startAt->startOfDay();

        /** @var WorkSchedule|null $schedule */
        $schedule = WorkSchedule::query()
            ->where('day_of_week', (int) $day->dayOfWeek)
            ->where('is_active', true)
            ->first();

        if ($schedule === null) {
            return false;
        }

        $dayStart = CarbonImmutable::parse($schedule->start_time)->setDate($day->year, $day->month, $day->day);
        $dayEnd = CarbonImmutable::parse($schedule->end_time)->setDate($day->year, $day->month, $day->day);

        if ($startAt->lessThan($dayStart) || $endAt->greaterThan($dayEnd)) {
            return false;
        }

        $intervals = array_merge(
            $this->blockedIntervals($day),
            $this->busyIntervals($day, $excludeRequestId),
        );

        return ! $this->overlapsAny($startAt, $endAt, $intervals);
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
