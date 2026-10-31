<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServicePackage extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'patient_id',
        'service',
        'sessions_count',
        'duration_minutes',
        'total_value_cents',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sessions_count' => 'integer',
            'duration_minutes' => 'integer',
            'total_value_cents' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Sesiones del paquete en el orden acordado.
     *
     * @return HasMany<AppointmentRequest, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(AppointmentRequest::class, 'package_id')
            ->orderBy('package_session_number')
            ->orderBy('id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'package_id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function activePayments(): HasMany
    {
        return $this->payments()->whereNull('voided_at');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return list<AppointmentRequest>
     */
    public function sessions(): array
    {
        return $this->relationLoaded('appointments')
            ? $this->appointments->all()
            : $this->appointments()->get()->all();
    }

    /**
     * Total pagado del paquete (solo pagos vigentes), en centavos.
     */
    public function totalPaidCents(): int
    {
        $loaded = $this->getAttribute('paid_cents');

        if ($loaded !== null) {
            return (int) $loaded;
        }

        if ($this->relationLoaded('payments')) {
            return (int) $this->payments->whereNull('voided_at')->sum('amount_cents');
        }

        return (int) $this->activePayments()->sum('amount_cents');
    }

    /**
     * Saldo pendiente del paquete, en centavos.
     */
    public function balanceCents(): int
    {
        return max(0, (int) $this->total_value_cents - $this->totalPaidCents());
    }

    /**
     * Estado financiero derivado: unpaid | partial | paid.
     */
    public function paymentStatus(): string
    {
        $paid = $this->totalPaidCents();

        if ($paid <= 0) {
            return AppointmentRequest::PAYMENT_UNPAID;
        }

        if ($paid < (int) $this->total_value_cents) {
            return AppointmentRequest::PAYMENT_PARTIAL;
        }

        return AppointmentRequest::PAYMENT_PAID;
    }

    /**
     * Conteo de sesiones por estado, calculado sobre las sesiones cargadas o
     * consultando la base si aún no se cargaron.
     *
     * @return array{programmed:int, attended:int, pending:int, cancelled:int, no_show:int}
     */
    public function sessionCounts(): array
    {
        $sessions = collect($this->sessions());

        return [
            'programmed' => $sessions->where('status', AppointmentRequest::STATUS_CONFIRMED)->count(),
            'attended' => $sessions->where('status', AppointmentRequest::STATUS_ATTENDED)->count(),
            'pending' => $sessions->whereIn('status', [
                AppointmentRequest::STATUS_PENDING,
                AppointmentRequest::STATUS_SLOTS_PROPOSED,
            ])->count(),
            'cancelled' => $sessions->where('status', AppointmentRequest::STATUS_CANCELLED)->count(),
            'no_show' => $sessions->where('status', AppointmentRequest::STATUS_NO_SHOW)->count(),
        ];
    }

    /**
     * Para que el panel pueda sumar el saldo de los paquetes de un paciente.
     */
    public function scopeWithPaidTotal(Builder $query): Builder
    {
        return $query->withSum(
            ['payments as paid_cents' => fn (Builder $query) => $query->whereNull('voided_at')],
            'amount_cents',
        );
    }
}
