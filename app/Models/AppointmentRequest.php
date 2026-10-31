<?php

namespace App\Models;

use Database\Factories\AppointmentRequestFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class AppointmentRequest extends Model
{
    /** @use HasFactory<AppointmentRequestFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_SLOTS_PROPOSED = 'slots_proposed';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_ATTENDED = 'attended';

    public const STATUS_NO_SHOW = 'no_show';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SLOTS_PROPOSED,
        self::STATUS_CONFIRMED,
        self::STATUS_ATTENDED,
        self::STATUS_CANCELLED,
        self::STATUS_NO_SHOW,
    ];

    /**
     * Estados que ocupan un espacio en la agenda. Una cita atendida o en la
     * que el paciente no asistió sigue formando parte del historial y no debe
     * liberar el horario en el pasado.
     *
     * @var list<string>
     */
    public const OCCUPYING_STATUSES = [
        self::STATUS_CONFIRMED,
        self::STATUS_ATTENDED,
        self::STATUS_NO_SHOW,
    ];

    /**
     * Estados que pueden reprogramarse. Solo una cita ya confirmada tiene un
     * horario reservado que se pueda mover sin alterar el flujo de la
     * solicitud (una propuesta pendiente no se confirma automáticamente).
     *
     * @var list<string>
     */
    public const RESCHEDULABLE_STATUSES = [
        self::STATUS_CONFIRMED,
    ];

    public const SOURCE_PUBLIC = 'public';

    public const SOURCE_MANUAL = 'manual';

    /*
        Estado financiero derivado de los pagos vigentes. Nunca se guarda en
        la cita: se calcula sumando pagos no anulados para evitar que quede
        desincronizado del historial real de transacciones.
    */
    public const PAYMENT_UNSET = 'unset';

    public const PAYMENT_UNPAID = 'unpaid';

    public const PAYMENT_PARTIAL = 'partial';

    public const PAYMENT_PAID = 'paid';

    /**
     * Servicios ofrecidos. Debe mantenerse sincronizado con
     * resources/js/data/services.ts.
     *
     * @var list<string>
     */
    public const SERVICES = [
        'Protectores auditivos',
        'Limpieza de Oídos',
        'Rehabilitación Vestibular',
        'Terapia de Voz',
        'Terapia de Lenguaje',
        'Terapia de Habla',
        'Terapia de Deglución',
        'Evaluación e Intervención en Lectoescritura',
    ];

    /**
     * Opción del formulario que permite al paciente escribir un servicio
     * distinto al catálogo oficial. El texto libre se guarda en la columna
     * "service" (mismo campo de texto ya existente), por lo que no requiere
     * cambios en la base de datos.
     */
    public const OTHER_SERVICE = 'Otro servicio';

    /**
     * Longitud máxima del servicio escrito por el paciente. Coincide con el
     * tamaño de la columna "service" en la base de datos.
     */
    public const CUSTOM_SERVICE_MAX_LENGTH = 100;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'patient_id',
        'package_id',
        'package_session_number',
        'patient_name',
        'patient_phone',
        'service',
        'status',
        'source',
        'duration_minutes',
        'service_value_cents',
        'proposed_slots',
        'confirmed_start',
        'confirmed_end',
        'notes',
        'attended_at',
        'cancelled_at',
        'no_show_at',
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
            'package_session_number' => 'integer',
            'service_value_cents' => 'integer',
            'proposed_slots' => 'array',
            'confirmed_start' => 'datetime',
            'confirmed_end' => 'datetime',
            'attended_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'no_show_at' => 'datetime',
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
     * Paquete de sesiones al que pertenece la cita, si aplica.
     *
     * @return BelongsTo<ServicePackage, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(ServicePackage::class, 'package_id');
    }

    /**
     * Indica si la cita es una sesión de un paquete. En ese caso el valor y el
     * saldo se gestionan desde el paquete, no desde la sesión.
     */
    public function isPackageSession(): bool
    {
        return $this->package_id !== null;
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'appointment_id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function activePayments(): HasMany
    {
        return $this->payments()->whereNull('voided_at');
    }

    /**
     * Historial completo de reprogramaciones, de la más reciente a la más
     * antigua. Cada cambio es una fila independiente.
     *
     * @return HasMany<AppointmentReschedule, $this>
     */
    public function reschedules(): HasMany
    {
        return $this->hasMany(AppointmentReschedule::class, 'appointment_id')
            ->latest('created_at')
            ->latest('id');
    }

    /**
     * Scope: citas que ocupan espacio definitivo en la agenda. Incluye las
     * atendidas y las no realizadas para conservar el historial y evitar que
     * un cambio de estado libere por error un horario pasado.
     */
    public function scopeOccupying(Builder $query): Builder
    {
        return $query->whereIn('status', self::OCCUPYING_STATUSES)
            ->whereNotNull('confirmed_start')
            ->whereNotNull('confirmed_end');
    }

    /**
     * Citas que todavía representan un valor por cobrar. Las canceladas y
     * las no realizadas se excluyen por defecto.
     */
    public function scopeChargeable(Builder $query): Builder
    {
        return $query->whereNotIn('status', [self::STATUS_CANCELLED, self::STATUS_NO_SHOW]);
    }

    /**
     * Citas individuales, sin paquete. El saldo de las sesiones de un paquete
     * se calcula una sola vez desde el paquete para no duplicar el pendiente.
     */
    public function scopeStandalone(Builder $query): Builder
    {
        return $query->whereNull('package_id');
    }

    /**
     * Carga el total pagado (solo pagos vigentes) como atributo "paid_cents".
     */
    public function scopeWithPaidTotal(Builder $query): Builder
    {
        return $query->withSum(
            ['payments as paid_cents' => fn (Builder $query) => $query->whereNull('voided_at')],
            'amount_cents',
        );
    }

    /**
     * Total pagado hasta el momento, en centavos.
     */
    public function totalPaidCents(): int
    {
        $loaded = $this->getAttribute('paid_cents');

        if ($loaded !== null) {
            return (int) $loaded;
        }

        if ($this->relationLoaded('payments')) {
            return (int) $this->payments
                ->whereNull('voided_at')
                ->sum('amount_cents');
        }

        return (int) $this->activePayments()->sum('amount_cents');
    }

    /**
     * Saldo pendiente en centavos. Null cuando aún no se ha definido el valor
     * acordado del servicio.
     */
    public function balanceCents(): ?int
    {
        if ($this->service_value_cents === null) {
            return null;
        }

        return max(0, (int) $this->service_value_cents - $this->totalPaidCents());
    }

    /**
     * Estado financiero derivado: unset | unpaid | partial | paid.
     */
    public function paymentStatus(): string
    {
        if ($this->service_value_cents === null || $this->service_value_cents <= 0) {
            return self::PAYMENT_UNSET;
        }

        $paid = $this->totalPaidCents();

        if ($paid <= 0) {
            return self::PAYMENT_UNPAID;
        }

        if ($paid < (int) $this->service_value_cents) {
            return self::PAYMENT_PARTIAL;
        }

        return self::PAYMENT_PAID;
    }

    public function isAttended(): bool
    {
        return $this->status === self::STATUS_ATTENDED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function isNoShow(): bool
    {
        return $this->status === self::STATUS_NO_SHOW;
    }

    /**
     * Una cita puede reprogramarse solo si está confirmada y conserva el
     * horario reservado. Las pendientes, canceladas, atendidas y no
     * realizadas mantienen su estado y su historial intactos.
     */
    public function isReschedulable(): bool
    {
        return in_array($this->status, self::RESCHEDULABLE_STATUSES, true)
            && $this->confirmed_start !== null
            && $this->confirmed_end !== null;
    }

    /**
     * Indica si la solicitud tiene horarios propuestos actualmente.
     */
    public function hasProposedSlots(): bool
    {
        return ! empty($this->proposed_slots);
    }

    /**
     * Mensaje con los horarios propuestos al paciente.
     *
     * Se genera siempre con los datos reales de la solicitud: el nombre
     * registrado y los horarios seleccionados por Karime. Si el nombre no
     * está disponible se usa un saludo genérico.
     *
     * @param  list<array{start: string, end: string}>  $slots
     */
    public static function buildProposalMessage(?string $patientName, array $slots): string
    {
        $lines = collect($slots)
            ->map(function (array $slot) {
                return '- '.self::formatSlotLabel($slot['start'] ?? null);
            })
            ->implode("\n");

        return self::greeting($patientName).'Tengo estos horarios disponibles para tu cita:'."\n\n{$lines}\n\n"
            .'Por favor, dime cuál de estos horarios te queda mejor para agendar tu cita. Quedo atenta.';
    }

    /**
     * Mensaje de confirmación de la cita, con la fecha y la hora reales.
     *
     * @param  string  $confirmedStart  Fecha y hora confirmadas (Y-m-d H:i:s).
     */
    public static function buildConfirmationMessage(?string $patientName, string $confirmedStart): string
    {
        $start = Carbon::parse($confirmedStart)->locale('es');

        $date = $start->translatedFormat('l, j \d\e F \d\e Y');
        $time = $start->translatedFormat('g:i A');

        return self::greeting($patientName, exclamation: true).'Tu cita con Karime Sandoval ha sido confirmada.'."\n\n"
            ."Fecha: {$date}\n"
            ."Hora: {$time}\n\n"
            .'Te recomendamos llegar 10 minutos antes de tu cita para que podamos atenderte puntualmente.'."\n\n"
            .'Si necesitas cancelar o reprogramar, por favor avísame con anticipación.'."\n\n"
            .'¡Muchas gracias por confiar en nosotros! Te esperamos.';
    }

    /**
     * Mensaje de reprogramación listo para copiar y enviar manualmente.
     *
     * Incluye el nombre del paciente, la fecha anterior y la nueva fecha y
     * hora. No se envía automáticamente: la administradora decide cuándo y
     * por qué canal lo comparte.
     */
    public static function buildRescheduleMessage(?string $patientName, string $previousStart, string $newStart): string
    {
        $previous = Carbon::parse($previousStart)->locale('es');
        $new = Carbon::parse($newStart)->locale('es');

        $previousLabel = ucfirst($previous->translatedFormat('l, j \d\e F \d\e Y')).' a las '.$previous->translatedFormat('g:i A');
        $newLabel = ucfirst($new->translatedFormat('l, j \d\e F \d\e Y')).' a las '.$new->translatedFormat('g:i A');

        return self::greeting($patientName, exclamation: true).'Tu cita con Karime Sandoval fue reprogramada.'."\n\n"
            ."Fecha anterior: {$previousLabel}\n"
            ."Nueva fecha: {$newLabel}\n\n"
            .'Si el nuevo horario no te sirve, por favor avísame para buscar otra opción.'."\n\n"
            .'¡Gracias por tu comprensión!';
    }

    /**
     * Saludo con el nombre del paciente (o genérico si no hay nombre).
     */
    private static function greeting(?string $patientName, bool $exclamation = false): string
    {
        $name = trim((string) $patientName);

        if ($name === '') {
            return $exclamation ? '¡Hola!' : 'Hola.';
        }

        // Solo el primer nombre, para mantener un tono cercano.
        $firstName = explode(' ', $name)[0] ?: $name;

        return $exclamation ? "¡Hola, {$firstName}!" : "Hola, {$firstName}.";
    }

    /**
     * Etiqueta legible de un horario propuesto: "Martes, 27 de octubre, 9:00 a. m.".
     */
    private static function formatSlotLabel(?string $start): string
    {
        if (! $start) {
            return '—';
        }

        $date = Carbon::parse($start)->locale('es');

        $weekday = ucfirst($date->translatedFormat('l'));
        $day = $date->translatedFormat('j \d\e F');
        $time = $date->translatedFormat('g:i A');

        return "{$weekday}, {$day}, {$time}";
    }
}
