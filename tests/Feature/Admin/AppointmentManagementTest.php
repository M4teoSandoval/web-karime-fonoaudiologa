<?php

use App\Models\AppointmentRequest;
use App\Models\User;
use App\Models\WorkSchedule;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    // Lunes a viernes de 09:00 a 12:00 (2026-10-19 es un lunes).
    foreach ([1, 2, 3, 4, 5] as $day) {
        WorkSchedule::create([
            'day_of_week' => $day,
            'start_time' => '09:00',
            'end_time' => '12:00',
            'is_active' => true,
        ]);
    }
});

test('el panel calcula espacios disponibles según jornada y duración', function () {
    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $response = $this->actingAs($this->admin)->getJson('/admin/disponibilidad?date=2026-10-19&duration=60&exclude='.$appointment->id);

    $response->assertOk();
    $slots = $response->json('slots');

    expect($slots)->not->toBeEmpty();
    expect($slots[0]['start'])->toBe('2026-10-19 09:00:00');
    // 09:00, 09:15, ..., 11:00 (último inicio que cabe en 3 horas con 60 min).
    expect(count($slots))->toBe(9);
});

test('una cita confirmada ocupa el espacio disponible', function () {
    AppointmentRequest::factory()->confirmed('2026-10-19 09:00:00', 60)->create();

    $slots = $this->actingAs($this->admin)
        ->getJson('/admin/disponibilidad?date=2026-10-19&duration=60')
        ->json('slots');

    $starts = array_column($slots, 'start');
    expect($starts)->not->toContain('2026-10-19 09:00:00');
    expect($starts)->not->toContain('2026-10-19 09:30:00');
    expect($starts)->toContain('2026-10-19 10:00:00');
});

test('confirmar una cita reserva el horario', function () {
    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/confirmar", ['start' => '2026-10-19 09:00:00'])
        ->assertSessionHasNoErrors();

    $appointment->refresh();

    expect($appointment->status)->toBe(AppointmentRequest::STATUS_CONFIRMED);
    expect($appointment->confirmed_start->format('Y-m-d H:i:s'))->toBe('2026-10-19 09:00:00');
    expect($appointment->confirmed_end->format('Y-m-d H:i:s'))->toBe('2026-10-19 10:00:00');
});

test('no se puede confirmar una cita sobre un horario ya ocupado', function () {
    AppointmentRequest::factory()->confirmed('2026-10-19 09:00:00', 60)->create();

    $other = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$other->id}/confirmar", ['start' => '2026-10-19 09:00:00'])
        ->assertSessionHas('flash');

    $flash = session('flash');

    expect($flash['type'])->toBe('error');
    expect($other->refresh()->status)->toBe(AppointmentRequest::STATUS_PENDING);
});

test('no se puede confirmar una cita dentro de un bloqueo', function () {
    \App\Models\AvailabilityBlock::create([
        'date' => '2026-10-19',
        'start_time' => '09:00',
        'end_time' => '10:00',
        'reason' => 'Personal',
    ]);

    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/confirmar", ['start' => '2026-10-19 09:00:00']);

    expect($appointment->refresh()->status)->toBe(AppointmentRequest::STATUS_PENDING);
});

test('proponer horarios no reserva el espacio pero cambia el estado', function () {
    $appointment = AppointmentRequest::factory()->create(['duration_minutes' => 60]);

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$appointment->id}/proponer", ['slots' => ['2026-10-19 09:00:00', '2026-10-19 10:00:00']])
        ->assertSessionHasNoErrors();

    $appointment->refresh();

    expect($appointment->status)->toBe(AppointmentRequest::STATUS_SLOTS_PROPOSED);
    expect($appointment->proposed_slots)->toHaveCount(2);

    // El espacio sigue libre para otras citas.
    $slots = $this->actingAs($this->admin)
        ->getJson('/admin/disponibilidad?date=2026-10-19&duration=60')
        ->json('slots');

    expect(array_column($slots, 'start'))->toContain('2026-10-19 09:00:00');
});

test('cancelar una solicitud libera el horario', function () {
    $appointment = AppointmentRequest::factory()->confirmed('2026-10-19 09:00:00', 60)->create();

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$appointment->id}/cancelar");

    expect($appointment->refresh()->status)->toBe(AppointmentRequest::STATUS_CANCELLED);

    $slots = $this->actingAs($this->admin)
        ->getJson('/admin/disponibilidad?date=2026-10-19&duration=60')
        ->json('slots');

    expect(array_column($slots, 'start'))->toContain('2026-10-19 09:00:00');
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
    expect($response->viewData('appointments')->total())->toBe(1);
});
