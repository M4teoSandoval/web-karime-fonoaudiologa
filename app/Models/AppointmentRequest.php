<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentRequest extends Model
{
    /** @use HasFactory<\Database\Factories\AppointmentRequestFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_SLOTS_PROPOSED = 'slots_proposed';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SLOTS_PROPOSED,
        self::STATUS_CONFIRMED,
        self::STATUS_CANCELLED,
    ];

    /**
     * Servicios ofrecidos. Debe mantenerse sincronizado con
     * resources/js/data/services.ts.
     *
     * @var list<string>
     */
    public const SERVICES = [
        'Terapia de Lenguaje',
        'Terapia de Habla',
        'Terapia de Deglución',
        'Limpieza de Oídos',
        'Rehabilitación Vestibular',
        'Terapia de Voz',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'patient_name',
        'service',
        'status',
        'duration_minutes',
        'proposed_slots',
        'confirmed_start',
        'confirmed_end',
        'notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'proposed_slots' => 'array',
            'confirmed_start' => 'datetime',
            'confirmed_end' => 'datetime',
        ];
    }

    /**
     * Scope: solicitudes que ocupan espacio definitivo en la agenda.
     */
    public function scopeOccupying(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_CONFIRMED)
            ->whereNotNull('confirmed_start')
            ->whereNotNull('confirmed_end');
    }

    /**
     * Indica si la solicitud tiene horarios propuestos actualmente.
     */
    public function hasProposedSlots(): bool
    {
        return ! empty($this->proposed_slots);
    }

    /**
     * Mensaje de WhatsApp de propuesta de horarios para el paciente.
     *
     * @param  list<array{start: string, end: string}>  $slots
     */
    public static function buildProposalMessage(array $slots): string
    {
        $lines = collect($slots)
            ->map(function (array $slot) {
                $start = \Illuminate\Support\Carbon::parse($slot['start']);

                return '- '.$start->translatedFormat('dddd d \d\e L, h:i A');
            })
            ->implode("\n");

        return "Hola, tengo disponibles las siguientes opciones para tu cita:\n\n{$lines}\n\n¿Cuál te queda mejor? Muchas gracias.";
    }
}
