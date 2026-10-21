<?php

use App\Models\AppointmentRequest;
use App\Models\AvailabilityBlock;
use App\Models\User;
use App\Models\WorkSchedule;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    // Lunes a viernes de 09:00 a 12:00.
    foreach ([1, 2, 3, 4, 5] as $day) {
        WorkSchedule::create([
            'day_of_week' => $day,
            'start_time' => '09:00',
            'end_time' => '12:00',
            'is_active' => true,
        ]);
    }

    // La fecha se calcula dinámicamente para que la jornada nunca quede en el
    // pasado (la disponibilidad solo ofrece fechas de hoy en adelante).
    $this->date = nextWeekdayDate();
});

test('el panel calcula espacios disponibles según jornada y duración', function () {
    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $response = $this->actingAs($this->admin)->getJson('/admin/disponibilidad?date='.$this->date.'&duration=60&exclude='.$appointment->id);

    $response->assertOk();
    $slots = $response->json('slots');

    expect($slots)->not->toBeEmpty();
    expect($slots[0]['start'])->toBe($this->date.' 09:00:00');
    // 09:00, 09:15, ..., 11:00 (último inicio que cabe en 3 horas con 60 min).
    expect(count($slots))->toBe(9);
});

test('una cita confirmada ocupa el espacio disponible', function () {
    AppointmentRequest::factory()->confirmed($this->date.' 09:00:00', 60)->create();

    $slots = $this->actingAs($this->admin)
        ->getJson('/admin/disponibilidad?date='.$this->date.'&duration=60')
        ->json('slots');

    $starts = array_column($slots, 'start');
    expect($starts)->not->toContain($this->date.' 09:00:00');
    expect($starts)->not->toContain($this->date.' 09:30:00');
    expect($starts)->toContain($this->date.' 10:00:00');
});

test('confirmar una cita reserva el horario', function () {
    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/confirmar", ['start' => $this->date.' 09:00:00'])
        ->assertSessionHasNoErrors();

    $appointment->refresh();

    expect($appointment->status)->toBe(AppointmentRequest::STATUS_CONFIRMED);
    expect($appointment->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->date.' 09:00:00');
    expect($appointment->confirmed_end->format('Y-m-d H:i:s'))->toBe($this->date.' 10:00:00');
});

test('no se puede confirmar una cita sobre un horario ya ocupado', function () {
    AppointmentRequest::factory()->confirmed($this->date.' 09:00:00', 60)->create();

    $other = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$other->id}/confirmar", ['start' => $this->date.' 09:00:00'])
        ->assertSessionHas('flash');

    $flash = session('flash');

    expect($flash['type'])->toBe('error');
    expect($other->refresh()->status)->toBe(AppointmentRequest::STATUS_PENDING);
});

test('no se puede confirmar una cita dentro de un bloqueo', function () {
    AvailabilityBlock::create([
        'date' => $this->date,
        'start_time' => '09:00',
        'end_time' => '10:00',
        'reason' => 'Personal',
    ]);

    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/confirmar", ['start' => $this->date.' 09:00:00']);

    expect($appointment->refresh()->status)->toBe(AppointmentRequest::STATUS_PENDING);
});

test('proponer horarios no reserva el espacio pero cambia el estado', function () {
    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/proponer", ['slots' => [$this->date.' 09:00:00', $this->date.' 10:00:00']])
        ->assertSessionHasNoErrors();

    $appointment->refresh();

    expect($appointment->status)->toBe(AppointmentRequest::STATUS_SLOTS_PROPOSED);
    expect($appointment->proposed_slots)->toHaveCount(2);

    // Los horarios guardados son los seleccionados, sin desplazarlos.
    expect($appointment->proposed_slots[0]['start'])->toBe($this->date.' 09:00:00');
    expect($appointment->proposed_slots[0]['end'])->toBe($this->date.' 10:00:00');
    expect($appointment->proposed_slots[1]['start'])->toBe($this->date.' 10:00:00');
    expect($appointment->proposed_slots[1]['end'])->toBe($this->date.' 11:00:00');

    // El espacio sigue libre para otras citas.
    $slots = $this->actingAs($this->admin)
        ->getJson('/admin/disponibilidad?date='.$this->date.'&duration=60')
        ->json('slots');

    expect(array_column($slots, 'start'))->toContain($this->date.' 09:00:00');
});

test('cancelar una solicitud libera el horario', function () {
    $appointment = AppointmentRequest::factory()->confirmed($this->date.' 09:00:00', 60)->create();

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$appointment->id}/cancelar");

    expect($appointment->refresh()->status)->toBe(AppointmentRequest::STATUS_CANCELLED);

    $slots = $this->actingAs($this->admin)
        ->getJson('/admin/disponibilidad?date='.$this->date.'&duration=60')
        ->json('slots');

    expect(array_column($slots, 'start'))->toContain($this->date.' 09:00:00');
});

test('el admin puede configurar sus horarios de atención', function () {
    $this->actingAs($this->admin)->put('/admin/horarios', [
        'schedules' => collect(range(0, 6))->map(fn (int $day) => [
            'day_of_week' => $day,
            'is_active' => $day === 6,
            'start_time' => $day === 6 ? '08:00' : null,
            'end_time' => $day === 6 ? '13:00' : null,
        ])->all(),
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('work_schedules', [
        'day_of_week' => 6,
        'is_active' => true,
        'start_time' => '08:00:00',
    ]);
});

test('las solicitudes del panel se filtran por estado', function () {
    AppointmentRequest::factory()->create(['status' => 'pending']);
    AppointmentRequest::factory()->create(['status' => 'confirmed']);

    $response = $this->actingAs($this->admin)->get('/admin/solicitudes?status=confirmed');

    $response->assertOk();
    expect($response->inertiaProps('pagination.total'))->toBe(1);
});

test('el panel muestra el servicio personalizado de la cita', function () {
    $appointment = AppointmentRequest::factory()->create([
        'patient_name' => 'Mateo Sandoval',
        'service' => 'Drenaje lingual',
    ]);

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/requests/show')
            ->where('appointment.service', 'Drenaje lingual')
            ->where('appointment.patient_name', 'Mateo Sandoval')
        );
});

test('el mensaje de propuesta incluye el nombre del paciente y los horarios reales', function () {
    $appointment = AppointmentRequest::factory()->create(['patient_name' => 'Mateo Sandoval']);

    $slotOne = nextWeekday('09:00:00');
    $slotTwo = nextWeekday('10:30:00');

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/proponer", ['slots' => [$slotOne, $slotTwo]])
        ->assertSessionHasNoErrors();

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointment.proposal_message', function (string $message) {
                return str_contains($message, 'Hola, Mateo.')
                    && str_contains($message, '9:00 a. m.')
                    && str_contains($message, '10:30 a. m.')
                    && str_contains($message, 'Tengo estos horarios disponibles');
            })
        );
});

test('sin horarios propuestos no hay mensaje de propuesta', function () {
    $appointment = AppointmentRequest::factory()->create(['patient_name' => 'Mateo Sandoval']);

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$appointment->id}")
        ->assertInertia(fn ($page) => $page->where('appointment.proposal_message', null));
});

test('el mensaje de confirmación usa el nombre y la fecha/hora confirmadas', function () {
    $appointment = AppointmentRequest::factory()->create(['patient_name' => 'Mateo Sandoval']);

    $start = nextWeekday('09:00:00');

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/confirmar", ['start' => $start])
        ->assertSessionHasNoErrors();

    $appointment->refresh();

    expect($appointment->status)->toBe(AppointmentRequest::STATUS_CONFIRMED);

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('appointment.confirmation_message', function (string $message) {
                return str_contains($message, '¡Hola, Mateo!')
                    && str_contains($message, 'Tu cita con Karime Sandoval ha sido confirmada')
                    && str_contains($message, 'Fecha: ')
                    && str_contains($message, 'Hora: 9:00 a. m.');
            })
        );
});

test('sin cita confirmada no hay mensaje de confirmación', function () {
    $appointment = AppointmentRequest::factory()->create(['patient_name' => 'Mateo Sandoval']);

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$appointment->id}")
        ->assertInertia(fn ($page) => $page->where('appointment.confirmation_message', null));
});

test('el mensaje usa un saludo genérico cuando no hay nombre disponible', function () {
    $message = AppointmentRequest::buildProposalMessage(null, [
        ['start' => '2026-10-26 09:00:00', 'end' => '2026-10-26 10:00:00'],
    ]);

    expect($message)->toContain('Hola.')->not->toContain('null');

    $confirmation = AppointmentRequest::buildConfirmationMessage('', '2026-10-26 09:00:00');

    expect($confirmation)->toContain('¡Hola!')->not->toContain('null');
});
