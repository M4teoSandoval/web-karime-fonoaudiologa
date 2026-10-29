<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro inmutable de una reprogramación de cita.
 *
 * Cada cambio crea una fila nueva: nunca se sobrescribe el historial previo.
 */
class AppointmentReschedule extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'appointment_id',
        'previous_start',
        'previous_end',
        'new_start',
        'new_end',
        'reason',
        'rescheduled_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'previous_start' => 'datetime',
            'previous_end' => 'datetime',
            'new_start' => 'datetime',
            'new_end' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AppointmentRequest, $this>
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(AppointmentRequest::class, 'appointment_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function rescheduledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rescheduled_by');
    }
}
