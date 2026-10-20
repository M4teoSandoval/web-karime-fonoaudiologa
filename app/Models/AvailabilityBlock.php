<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AvailabilityBlock extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'date',
        'start_time',
        'end_time',
        'reason',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    /**
     * Bloqueo de día completo (sin franja horaria).
     */
    public function isFullDay(): bool
    {
        return $this->start_time === null || $this->end_time === null;
    }
}
