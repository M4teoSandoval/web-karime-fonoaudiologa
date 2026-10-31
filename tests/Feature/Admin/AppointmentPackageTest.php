<?php

use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\ServicePackage;
use App\Models\User;
use App\Models\WorkSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

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

    $this->patient = Patient::create([
        'name' => 'Ana Pérez',
        'phone' => '300 123 4567',
        'phone_normalized' => Patient::normalizePhone('300 123 4567'),
    ]);
});

/**
 * Genera sesiones futuras en días hábiles distintos, todas a la misma hora.
 *
 * @return list<array{date: string, start_time: string}>
 */
function packageTestSessions(int $count, string $time = '09:00', ?Carbon $from = null): array
{
    $cursor = ($from ?? Carbon::parse(nextWeekdayDate()))->copy()->startOfDay();
    $sessions = [];
    $guard = 0;

    while (count($sessions) < $count && $guard < 400) {
        if (! $cursor->isWeekend()) {
            $sessions[] = [
                'date' => $cursor->format('Y-m-d'),
                'start_time' => $time,
            ];
        }

        $cursor->addDay();
        $guard++;
    }

    return $sessions;
}

/**
 * @param  list<array{date: string, start_time: string}>  $sessions
 * @return array<string, mixed>
 */
function packageTestPayload(Patient $patient, int $count, array $sessions, array $overrides = []): array
{
    return array_merge([
        'patient_mode' => 'existing',
        'patient_id' => $patient->id,
        'service' => AppointmentRequest::SERVICES[0],
        'sessions_count' => $count,
        'total_value' => '800000',
        'duration_minutes' => 60,
        'notes' => 'Paquete de prueba',
        'sessions' => $sessions,
    ], $overrides);
}

test('crea un paquete de 8 sesiones y las reserva en la agenda', function () {
    $sessions = packageTestSessions(8);

    $response = $this->actingAs($this->admin)->post('/admin/paquetes', packageTestPayload(
        $this->patient,
        8,
        $sessions,
        [
            'initial_payment' => '300000',
            'initial_payment_on' => today()->toDateString(),
            'initial_payment_method' => 'cash',
            'initial_payment_idempotency_key' => (string) Str::uuid(),
        ],
    ));

    $package = ServicePackage::query()->firstOrFail();

    $response->assertRedirect(route('admin.packages.show', $package));

    expect($package->sessions_count)->toBe(8)
        ->and($package->total_value_cents)->toBe(80_000_000)
        ->and($package->appointments)->toHaveCount(8)
        ->and($package->appointments->pluck('package_session_number')->all())->toBe(range(1, 8))
        ->and($package->appointments->every(fn (AppointmentRequest $session) => $session->status === AppointmentRequest::STATUS_CONFIRMED))->toBeTrue()
        ->and($package->appointments->every(fn (AppointmentRequest $session) => $session->service_value_cents === null))->toBeTrue();

    expect($package->totalPaidCents())->toBe(30_000_000)
        ->and($package->balanceCents())->toBe(50_000_000)
        ->and($package->paymentStatus())->toBe(AppointmentRequest::PAYMENT_PARTIAL);

    // El abono inicial se guarda una sola vez, asociado al paquete y no a
    // cada una de las 8 sesiones.
    expect(Payment::query()->count())->toBe(1);

    $payment = Payment::query()->firstOrFail();
    expect($payment->package_id)->toBe($package->id)
        ->and($payment->appointment_id)->toBe($package->appointments->first()->id);
});

test('crea paquetes con cantidades distintas de sesiones', function () {
    foreach ([2, 4, 6, 10] as $index => $count) {
        // Cada paquete empieza dos semanas después del anterior para no chocar
        // con las citas que ya reservó el paquete previo.
        $from = Carbon::parse(nextWeekdayDate())->addWeeks(($index + 1) * 2);

        $response = $this->actingAs($this->admin)->post('/admin/paquetes', packageTestPayload(
            $this->patient,
            $count,
            packageTestSessions($count, '09:00', $from),
            ['total_value' => (string) ($count * 100000)],
        ));

        $response->assertRedirect();

        $package = ServicePackage::query()->latest('id')->firstOrFail();

        expect($package->sessions_count)->toBe($count)
            ->and($package->appointments()->count())->toBe($count);
    }
});

test('guarda las fechas y horas manuales sin alterarlas', function () {
    $sessions = packageTestSessions(3);
    $sessions[0]['start_time'] = '10:30';
    $sessions[1]['start_time'] = '11:00';
    $sessions[2]['start_time'] = '09:30';

    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 3, $sessions))
        ->assertRedirect();

    $package = ServicePackage::query()->firstOrFail();

    $expected = collect($sessions)
        ->map(fn (array $session) => $session['date'].' '.$session['start_time'].':00')
        ->all();

    expect($package->appointments->pluck('confirmed_start')->map->format('Y-m-d H:i:s')->all())
        ->toBe($expected);
});

test('propone y guarda una programación recurrente de dos veces por semana', function () {
    $start = Carbon::parse(nextWeekdayDate());

    // Asegura que la fecha inicial sea lunes para que la propuesta sea estable.
    while ($start->dayOfWeek !== Carbon::MONDAY) {
        $start->addDay();
    }

    $preview = $this->actingAs($this->admin)->postJson('/admin/paquetes/proponer', [
        'start_date' => $start->format('Y-m-d'),
        'start_time' => '09:00',
        'sessions_count' => 6,
        'weekdays' => [Carbon::MONDAY, Carbon::WEDNESDAY],
    ]);

    $preview->assertOk();

    $sessions = $preview->json('sessions');

    expect($sessions)->toHaveCount(6);

    foreach ($sessions as $session) {
        expect(Carbon::parse($session['date'])->dayOfWeek)->toBeIn([Carbon::MONDAY, Carbon::WEDNESDAY]);
    }

    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 6, $sessions))
        ->assertRedirect();

    $package = ServicePackage::query()->firstOrFail();

    expect($package->appointments)->toHaveCount(6)
        ->and($package->appointments->pluck('confirmed_start')->map->format('Y-m-d')->all())
        ->toBe(collect($sessions)->pluck('date')->all());
});

test('rechaza el paquete si una sesión se cruza con una cita existente', function () {
    $sessions = packageTestSessions(3);

    AppointmentRequest::factory()->confirmed($sessions[1]['date'].' '.$sessions[1]['start_time'].':00', 60)->create([
        'patient_id' => $this->patient->id,
    ]);

    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 3, $sessions))
        ->assertSessionHasErrors('sessions.1.start_time');

    expect(ServicePackage::query()->count())->toBe(0)
        ->and(AppointmentRequest::query()->whereNotNull('package_id')->count())->toBe(0);
});

test('rechaza el paquete si una sesión está fuera de la jornada', function () {
    $sessions = packageTestSessions(3);
    $sessions[2]['start_time'] = '13:00';

    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 3, $sessions))
        ->assertSessionHasErrors('sessions.2.start_time');

    expect(ServicePackage::query()->count())->toBe(0)
        ->and(AppointmentRequest::query()->whereNotNull('package_id')->count())->toBe(0);
});

test('es atómico: si una sesión falla no se crea ninguna cita ni el paciente nuevo', function () {
    $sessions = packageTestSessions(2);
    $sessions[1]['start_time'] = '13:30'; // fuera de jornada

    $patientsBefore = Patient::query()->count();

    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 2, $sessions, [
            'patient_mode' => 'new',
            'patient_id' => null,
            'patient_name' => 'Paciente Nuevo',
            'patient_phone' => '310 999 8877',
        ]))
        ->assertSessionHasErrors('sessions.1.start_time');

    expect(ServicePackage::query()->count())->toBe(0)
        ->and(AppointmentRequest::query()->whereNotNull('package_id')->count())->toBe(0)
        ->and(Patient::query()->count())->toBe($patientsBefore);
});

test('conserva la relación entre el paciente y todas las sesiones', function () {
    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 4, packageTestSessions(4)))
        ->assertRedirect();

    $package = ServicePackage::query()->firstOrFail();

    expect($package->patient_id)->toBe($this->patient->id)
        ->and($package->appointments->every(fn (AppointmentRequest $session) => $session->patient_id === $this->patient->id))->toBeTrue();

    $this->actingAs($this->admin)
        ->get('/admin/pacientes/'.$this->patient->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/patients/show')
            ->has('packages', 1)
            ->where('packages.0.id', $package->id)
            ->where('packages.0.sessions_count', 4)
            ->where('packages.0.patient.id', $this->patient->id));

    $this->actingAs($this->admin)
        ->get('/admin/solicitudes/'.$package->appointments->first()->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/requests/show')
            ->where('appointment.package_id', $package->id)
            ->where('appointment.package_detail.sessions_count', 4)
            ->has('appointment.package_detail.sessions', 4));
});

test('registra pagos parciales y totales del paquete sin duplicar ingresos', function () {
    $this->actingAs($this->admin)->post('/admin/paquetes', packageTestPayload(
        $this->patient,
        8,
        packageTestSessions(8),
        [
            'initial_payment' => '300000',
            'initial_payment_on' => today()->toDateString(),
            'initial_payment_method' => 'cash',
            'initial_payment_idempotency_key' => (string) Str::uuid(),
        ],
    ));

    $package = ServicePackage::query()->firstOrFail();

    $this->actingAs($this->admin)->post('/admin/paquetes/'.$package->id.'/pagos', [
        'amount' => '200000',
        'paid_on' => today()->toDateString(),
        'method' => 'transfer',
        'idempotency_key' => (string) Str::uuid(),
    ])->assertRedirect();

    $package->refresh();
    expect($package->totalPaidCents())->toBe(50_000_000)
        ->and($package->balanceCents())->toBe(30_000_000);

    $this->actingAs($this->admin)->post('/admin/paquetes/'.$package->id.'/pagos', [
        'amount' => '300000',
        'paid_on' => today()->toDateString(),
        'idempotency_key' => (string) Str::uuid(),
    ])->assertRedirect();

    $package->refresh();
    expect($package->totalPaidCents())->toBe(80_000_000)
        ->and($package->balanceCents())->toBe(0)
        ->and($package->paymentStatus())->toBe(AppointmentRequest::PAYMENT_PAID);

    // Tres movimientos, nunca uno por sesión.
    expect(Payment::query()->where('package_id', $package->id)->count())->toBe(3);

    // El dashboard cuenta el ingreso una sola vez por movimiento.
    $this->actingAs($this->admin)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('finance.income_cents', 80_000_000)
            ->where('finance.outstanding_cents', 0));
});

test('rechaza un pago que supera el saldo del paquete', function () {
    $this->actingAs($this->admin)->post('/admin/paquetes', packageTestPayload(
        $this->patient,
        2,
        packageTestSessions(2),
        ['total_value' => '100000'],
    ));

    $package = ServicePackage::query()->firstOrFail();

    $this->actingAs($this->admin)->post('/admin/paquetes/'.$package->id.'/pagos', [
        'amount' => '150000',
        'paid_on' => today()->toDateString(),
        'idempotency_key' => (string) Str::uuid(),
    ])->assertSessionHasErrors('payment_amount');

    expect($package->fresh()->totalPaidCents())->toBe(0);
});

test('reprograma una sesión sin modificar las demás', function () {
    $sessions = packageTestSessions(2);

    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 2, $sessions))
        ->assertRedirect();

    $package = ServicePackage::query()->firstOrFail();
    $first = $package->appointments->first();
    $second = $package->appointments->last();
    $secondStart = $second->confirmed_start->copy();

    $newDate = Carbon::parse($sessions[0]['date'])->addDays(3);

    while ($newDate->isWeekend()) {
        $newDate->addDay();
    }

    $this->actingAs($this->admin)
        ->post('/admin/solicitudes/'.$first->id.'/reprogramar', [
            'date' => $newDate->format('Y-m-d'),
            'start_time' => '11:00',
            'duration_minutes' => 60,
            'reason' => 'Cambio solicitado por el paciente.',
        ])
        ->assertRedirect();

    $first->refresh();
    $second->refresh();

    expect($first->confirmed_start->format('Y-m-d H:i'))->toBe($newDate->format('Y-m-d').' 11:00')
        ->and($second->confirmed_start->equalTo($secondStart))->toBeTrue()
        ->and($first->reschedules()->count())->toBe(1)
        ->and($second->reschedules()->count())->toBe(0);
});

test('cancela una sesión sin afectar las demás ni borrar los pagos', function () {
    $this->actingAs($this->admin)->post('/admin/paquetes', packageTestPayload(
        $this->patient,
        2,
        packageTestSessions(2),
        [
            'initial_payment' => '200000',
            'initial_payment_on' => today()->toDateString(),
            'initial_payment_idempotency_key' => (string) Str::uuid(),
        ],
    ));

    $package = ServicePackage::query()->firstOrFail();
    $first = $package->appointments->first();
    $second = $package->appointments->last();

    $this->actingAs($this->admin)
        ->post('/admin/solicitudes/'.$first->id.'/cancelar')
        ->assertRedirect();

    expect($first->fresh()->status)->toBe(AppointmentRequest::STATUS_CANCELLED)
        ->and($second->fresh()->status)->toBe(AppointmentRequest::STATUS_CONFIRMED)
        ->and(Payment::query()->where('package_id', $package->id)->count())->toBe(1)
        ->and($package->fresh()->totalPaidCents())->toBe(20_000_000);
});

test('conserva el historial de sesiones atendidas y no permite cancelarlas', function () {
    $this->actingAs($this->admin)
        ->post('/admin/paquetes', packageTestPayload($this->patient, 2, packageTestSessions(2)))
        ->assertRedirect();

    $package = ServicePackage::query()->firstOrFail();
    $first = $package->appointments->first();
    $second = $package->appointments->last();

    $this->actingAs($this->admin)
        ->post('/admin/solicitudes/'.$first->id.'/atender', [
            'register_payment' => false,
        ])
        ->assertRedirect();

    $this->actingAs($this->admin)
        ->post('/admin/solicitudes/'.$first->id.'/cancelar')
        ->assertRedirect()
        ->assertSessionHas('flash.type', 'error');

    expect($first->fresh()->status)->toBe(AppointmentRequest::STATUS_ATTENDED)
        ->and($first->fresh()->attended_at)->not->toBeNull()
        ->and($second->fresh()->status)->toBe(AppointmentRequest::STATUS_CONFIRMED)
        ->and($package->fresh()->sessionCounts()['attended'])->toBe(1)
        ->and($package->fresh()->sessionCounts()['programmed'])->toBe(1);
});

test('un pago del paquete se conserva al marcar una sesión como atendida', function () {
    $this->actingAs($this->admin)->post('/admin/paquetes', packageTestPayload(
        $this->patient,
        2,
        packageTestSessions(2),
        ['total_value' => '200000'],
    ));

    $package = ServicePackage::query()->firstOrFail();
    $first = $package->appointments->first();

    $this->actingAs($this->admin)
        ->post('/admin/solicitudes/'.$first->id.'/atender', [
            'register_payment' => true,
            'payment_amount' => '50000',
            'payment_paid_on' => today()->toDateString(),
            'payment_method' => 'cash',
            'payment_idempotency_key' => (string) Str::uuid(),
        ])
        ->assertRedirect();

    expect($first->fresh()->status)->toBe(AppointmentRequest::STATUS_ATTENDED)
        ->and($package->fresh()->totalPaidCents())->toBe(5_000_000)
        ->and(Payment::query()->where('package_id', $package->id)->count())->toBe(1);
});
