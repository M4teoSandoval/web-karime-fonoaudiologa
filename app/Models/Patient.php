<?php

namespace App\Models;

use Database\Factories\PatientFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    /** @use HasFactory<PatientFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'phone_normalized',
    ];

    /**
     * Citas del paciente (incluye solicitudes históricas vinculadas).
     *
     * @return HasMany<AppointmentRequest, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(AppointmentRequest::class);
    }

    /**
     * Paquetes de sesiones adquiridos por el paciente.
     *
     * @return HasMany<ServicePackage, $this>
     */
    public function packages(): HasMany
    {
        return $this->hasMany(ServicePackage::class);
    }

    /**
     * Notas de seguimiento privadas.
     *
     * @return HasMany<PatientNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(PatientNote::class);
    }

    /**
     * Pagos realizados en las citas del paciente.
     *
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasManyThrough(
            Payment::class,
            AppointmentRequest::class,
            'patient_id',
            'appointment_id',
        );
    }

    /**
     * Normaliza un teléfono para comparaciones: solo dígitos y sin el
     * prefijo internacional de Colombia (+57) cuando está presente.
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 12 && str_starts_with($digits, '57')) {
            $digits = substr($digits, 2);
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Búsqueda por nombre o teléfono. El teléfono se compara con su versión
     * normalizada para que "+57 300 123 4567" encuentre "3001234567".
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        $digits = self::normalizePhone($term);

        return $query->where(function (Builder $query) use ($term, $digits) {
            $query->where('name', 'like', "%{$term}%");

            if ($digits !== null && strlen($digits) >= 3) {
                $query->orWhere('phone_normalized', 'like', "%{$digits}%");
            } else {
                $query->orWhere('phone', 'like', "%{$term}%");
            }
        });
    }
}
