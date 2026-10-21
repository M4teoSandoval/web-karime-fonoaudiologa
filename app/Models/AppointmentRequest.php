<?php

namespace App\Models;

use Database\Factories\AppointmentRequestFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class AppointmentRequest extends Model
{
    /** @use HasFactory<AppointmentRequestFactory> */
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
