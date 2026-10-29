<?php

use App\Models\AppointmentRequest;
use App\Models\AppointmentReschedule;
use App\Models\AvailabilityBlock;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use App\Models\WorkSchedule;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    foreach ([1, 2, 3, 4, 5] as $day) {
        WorkSchedule::create([
            'day_of_week' => $day,
            'start_time' => '09:00',
            'end_time' => '12:00',
            'is_active' => true,
        ]);
    }

    $this->date = nextWeekdayDate();
    $this->start = $this->date.' 09:00:00';

    $this->patient = Patient::create([
        'name' => 'Ana Pérez',
        'phone' => '300 123 4567',
        'phone_normalized' => Patient::normalizePhone('300 123 4567'),
    ]);

    $this->appointment = AppointmentRequest::factory()->confirmed($this->start, 60)->create([
        'patient_id' => $this->patient->id,
        'patient_name' => $this->patient->name,
        'patient_phone' => $this->patient->phone,
        'source' => AppointmentRequest::SOURCE_MANUAL,
        'service_value_cents' => 10_000_000,
        'notes' => 'Nota privada que debe conservarse.',
    ]);
});

/**
 * @return array<string, mixed>
 */
function reschedulePayload(string $date, string $time, int $duration = 60, ?string $reason = null): array
{
    $payload = [
        'date' => $date,
        'start_time' => $time,
        'duration_minutes' => $duration,
    ];

    if ($reason !== null) {
        $payload['reason'] = $reason;
    }

    return $payload;
}

test('una cita confirmada puede reprogramarse y conserva su estado', function () {
    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:30', 45, 'El paciente tuvo un imprevisto.'),
        )
        ->assertSessionHasNoErrors()
        ->assertSessionHas('flash', function (array $flash) {
            return $flash['type'] === 'success'
                && str_contains($flash['message'], 'reprogramada')
                && str_contains($flash['message'], '10:30');
        });

    $this->appointment->refresh();

    expect($this->appointment->status)->toBe(AppointmentRequest::STATUS_CONFIRMED);
    expect($this->appointment->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->date.' 10:30:00');
    expect($this->appointment->confirmed_end->format('Y-m-d H:i:s'))->toBe($this->date.' 11:15:00');
    expect($this->appointment->duration_minutes)->toBe(45);

    $history = AppointmentReschedule::query()->sole();

    expect($history->appointment_id)->toBe($this->appointment->id);
    expect($history->previous_start->format('Y-m-d H:i:s'))->toBe($this->start);
    expect($history->previous_end->format('Y-m-d H:i:s'))->toBe($this->date.' 10:00:00');
    expect($history->new_start->format('Y-m-d H:i:s'))->toBe($this->date.' 10:30:00');
    expect($history->new_end->format('Y-m-d H:i:s'))->toBe($this->date.' 11:15:00');
    expect($history->reason)->toBe('El paciente tuvo un imprevisto.');
    expect($history->rescheduled_by)->toBe($this->admin->id);
});

test('no se reprograma sobre otra cita confirmada', function () {
    AppointmentRequest::factory()->confirmed($this->date.' 10:00:00', 60)->create([
        'patient_name' => 'Otro paciente',
    ]);

    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 30),
        )
        ->assertSessionHasErrors('start_time');

    expect($this->appointment->refresh()->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->start);
    expect($this->appointment->confirmed_end->format('Y-m-d H:i:s'))->toBe($this->date.' 10:00:00');
    expect(AppointmentReschedule::query()->count())->toBe(0);
});

test('no se reprograma fuera del horario de atención', function () {
    foreach (['07:00', '11:30'] as $time) {
        $this->actingAs($this->admin)
            ->post(
                "/admin/solicitudes/{$this->appointment->id}/reprogramar",
                reschedulePayload($this->date, $time, 60),
            )
            ->assertSessionHasErrors('start_time');
    }

    expect($this->appointment->refresh()->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->start);
    expect(AppointmentReschedule::query()->count())->toBe(0);
});

test('no se reprograma sobre un bloqueo de agenda', function () {
    AvailabilityBlock::create([
        'date' => $this->date,
        'start_time' => '10:00',
        'end_time' => '11:00',
        'reason' => 'Congreso',
    ]);

    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 60),
        )
        ->assertSessionHasErrors('start_time');

    expect($this->appointment->refresh()->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->start);
    expect(AppointmentReschedule::query()->count())->toBe(0);
});

test('la propia cita se excluye al validar el nuevo horario', function () {
    // 09:30–10:30 se solapa con el horario anterior (09:00–10:00). Si la
    // validación no excluyera la propia cita, este cambio se rechazaría.
    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '09:30', 60),
        )
        ->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect($this->appointment->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->date.' 09:30:00');
    expect($this->appointment->confirmed_end->format('Y-m-d H:i:s'))->toBe($this->date.' 10:30:00');
    expect(AppointmentReschedule::query()->count())->toBe(1);
});

test('se conservan los pagos parciales y el saldo pendiente', function () {
    Payment::create([
        'appointment_id' => $this->appointment->id,
        'amount_cents' => 4_000_000,
        'paid_on' => now()->toDateString(),
        'recorded_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 60),
        )
        ->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect(Payment::query()->count())->toBe(1);
    expect($this->appointment->service_value_cents)->toBe(10_000_000);
    expect($this->appointment->totalPaidCents())->toBe(4_000_000);
    expect($this->appointment->balanceCents())->toBe(6_000_000);
    expect($this->appointment->paymentStatus())->toBe(AppointmentRequest::PAYMENT_PARTIAL);
});

test('se conservan el paciente y las notas de la cita', function () {
    $patientId = $this->appointment->patient_id;

    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 60),
        )
        ->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect($this->appointment->patient_id)->toBe($patientId);
    expect($this->appointment->patient_name)->toBe('Ana Pérez');
    expect($this->appointment->patient_phone)->toBe('300 123 4567');
    expect($this->appointment->notes)->toBe('Nota privada que debe conservarse.');
    expect(Patient::query()->count())->toBe(1);
});

test('varias reprogramaciones conservan todo el historial y el detalle lo muestra', function () {
    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 60, 'Primer cambio'),
        )
        ->assertSessionHasNoErrors();

    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '11:00', 60, 'Segundo cambio'),
        )
        ->assertSessionHasNoErrors();

    $changes = AppointmentReschedule::query()->orderBy('id')->get();

    expect($changes)->toHaveCount(2);
    expect($changes[0]->previous_start->format('Y-m-d H:i:s'))->toBe($this->date.' 09:00:00');
    expect($changes[0]->new_start->format('Y-m-d H:i:s'))->toBe($this->date.' 10:00:00');
    expect($changes[0]->reason)->toBe('Primer cambio');
    expect($changes[1]->previous_start->format('Y-m-d H:i:s'))->toBe($this->date.' 10:00:00');
    expect($changes[1]->new_start->format('Y-m-d H:i:s'))->toBe($this->date.' 11:00:00');
    expect($changes[1]->reason)->toBe('Segundo cambio');

    $expectedMessage = AppointmentRequest::buildRescheduleMessage(
        'Ana Pérez',
        $this->date.' 10:00:00',
        $this->date.' 11:00:00',
    );

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$this->appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/requests/show')
            ->where('appointment.reschedules.0.new_start', $this->date.' 11:00:00')
            ->where('appointment.reschedules.1.new_start', $this->date.' 10:00:00')
            ->where('appointment.reschedules.0.rescheduled_by_name', $this->admin->name)
            ->where('appointment.reschedules.0.reason', 'Segundo cambio')
            ->where('appointment.reschedule_message', $expectedMessage)
        );
});

test('solo las citas confirmadas pueden reprogramarse', function (string $status) {
    $this->appointment->update(['status' => $status]);

    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 60),
        )
        ->assertSessionHasErrors('status');

    $this->appointment->refresh();

    expect($this->appointment->status)->toBe($status);
    expect($this->appointment->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->start);
    expect(AppointmentReschedule::query()->count())->toBe(0);
})->with([
    'pendiente' => AppointmentRequest::STATUS_PENDING,
    'horarios propuestos' => AppointmentRequest::STATUS_SLOTS_PROPOSED,
    'cancelada' => AppointmentRequest::STATUS_CANCELLED,
    'atendida' => AppointmentRequest::STATUS_ATTENDED,
    'no realizada' => AppointmentRequest::STATUS_NO_SHOW,
]);

test('la reprogramación requiere una sesión de administrador', function () {
    $payload = reschedulePayload($this->date, '10:00', 60);

    $this->post("/admin/solicitudes/{$this->appointment->id}/reprogramar", $payload)
        ->assertRedirect('/login');

    $user = User::factory()->create(['role' => User::ROLE_USER]);

    $this->actingAs($user)
        ->post("/admin/solicitudes/{$this->appointment->id}/reprogramar", $payload)
        ->assertForbidden();

    expect($this->appointment->refresh()->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->start);
    expect(AppointmentReschedule::query()->count())->toBe(0);
});

test('la agenda libera el horario anterior y ocupa el nuevo', function () {
    $this->actingAs($this->admin)
        ->post(
            "/admin/solicitudes/{$this->appointment->id}/reprogramar",
            reschedulePayload($this->date, '10:00', 60),
        )
        ->assertSessionHasNoErrors();

    // El espacio anterior quedó libre: se puede reservar otra cita a las 09:00.
    $this->actingAs($this->admin)->post('/admin/citas', [
        'patient_mode' => 'existing',
        'patient_id' => $this->patient->id,
        'service' => AppointmentRequest::SERVICES[0],
        'date' => $this->date,
        'start_time' => '09:00',
        'duration_minutes' => 60,
        'service_value' => '100000',
    ])->assertSessionHasNoErrors();

    $dayIndex = Carbon::parse($this->date)->dayOfWeekIso - 1;

    $this->actingAs($this->admin)
        ->get('/admin/agenda?start='.$this->date)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/agenda')
            ->where("days.{$dayIndex}.date", $this->date)
            ->where("days.{$dayIndex}.appointments.0.start", '09:00')
            ->where("days.{$dayIndex}.appointments.1.start", '10:00')
            ->where("days.{$dayIndex}.appointments.1.id", $this->appointment->id)
        );
});
