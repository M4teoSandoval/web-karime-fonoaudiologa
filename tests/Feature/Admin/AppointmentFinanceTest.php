<?php

use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use App\Models\WorkSchedule;
use Illuminate\Support\Str;

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
    ]);
});

test('se crea una cita manual con paciente nuevo y valor acordado', function () {
    $response = $this->actingAs($this->admin)->post('/admin/citas', [
        'patient_mode' => 'new',
        'patient_name' => 'Carlos Ruiz',
        'patient_phone' => '310 555 0000',
        'service' => AppointmentRequest::SERVICES[0],
        'date' => $this->date,
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'service_value' => '150.000',
        'notes' => 'Paciente remitido por otro profesional.',
    ]);

    $appointment = AppointmentRequest::query()->where('patient_name', 'Carlos Ruiz')->firstOrFail();

    $response->assertRedirect(route('admin.requests.show', $appointment));

    expect($appointment->status)->toBe(AppointmentRequest::STATUS_CONFIRMED);
    expect($appointment->source)->toBe(AppointmentRequest::SOURCE_MANUAL);
    expect($appointment->service_value_cents)->toBe(15_000_000);
    expect($appointment->confirmed_start->format('Y-m-d H:i:s'))->toBe($this->date.' 10:00:00');
    expect($appointment->patient)->not->toBeNull();
    expect($appointment->patient->phone_normalized)->toBe('3105550000');
});

test('se puede crear una cita para un paciente existente', function () {
    $this->actingAs($this->admin)->post('/admin/citas', [
        'patient_mode' => 'existing',
        'patient_id' => $this->patient->id,
        'service' => AppointmentRequest::SERVICES[1],
        'date' => $this->date,
        'start_time' => '10:00',
        'duration_minutes' => 45,
        'service_value' => '90000',
    ])->assertSessionHasNoErrors();

    $appointment = AppointmentRequest::query()->where('patient_id', $this->patient->id)
        ->where('service', AppointmentRequest::SERVICES[1])
        ->firstOrFail();

    expect($appointment->patient_name)->toBe($this->patient->name);
    expect($appointment->patient_phone)->toBe($this->patient->phone);
});

test('no se crea un paciente nuevo con un teléfono ya registrado sin confirmación', function () {
    $this->actingAs($this->admin)->post('/admin/citas', [
        'patient_mode' => 'new',
        'patient_name' => 'Otra persona',
        'patient_phone' => '3001234567',
        'service' => AppointmentRequest::SERVICES[0],
        'date' => $this->date,
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'service_value' => '100000',
    ])->assertSessionHasErrors('patient_phone');

    expect(Patient::query()->count())->toBe(1);
});

test('se permite crear un paciente con teléfono compartido cuando se confirma', function () {
    $this->actingAs($this->admin)->post('/admin/citas', [
        'patient_mode' => 'new',
        'patient_name' => 'Familiar de Ana',
        'patient_phone' => '3001234567',
        'patient_allow_duplicate_phone' => true,
        'service' => AppointmentRequest::SERVICES[0],
        'date' => $this->date,
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'service_value' => '100000',
    ])->assertSessionHasNoErrors();

    expect(Patient::query()->count())->toBe(2);
});

test('una cita manual no puede ocupar un horario ya reservado', function () {
    $this->actingAs($this->admin)->post('/admin/citas', [
        'patient_mode' => 'existing',
        'patient_id' => $this->patient->id,
        'service' => AppointmentRequest::SERVICES[0],
        'date' => $this->date,
        'start_time' => '09:00',
        'duration_minutes' => 60,
        'service_value' => '100000',
    ])->assertSessionHasErrors('start_time');

    expect(AppointmentRequest::query()->count())->toBe(1);
});

test('los abonos parciales actualizan el saldo y el estado financiero', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/pagos", [
        'amount' => '40000',
        'paid_on' => now()->toDateString(),
        'method' => 'cash',
        'notes' => 'Primer abono',
    ])->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect($this->appointment->totalPaidCents())->toBe(4_000_000);
    expect($this->appointment->balanceCents())->toBe(6_000_000);
    expect($this->appointment->paymentStatus())->toBe(AppointmentRequest::PAYMENT_PARTIAL);
});

test('no se permite un pago superior al saldo pendiente', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/pagos", [
        'amount' => '100001',
        'paid_on' => now()->toDateString(),
    ])->assertSessionHasErrors('payment_amount');

    expect(Payment::query()->count())->toBe(0);
    expect($this->appointment->refresh()->balanceCents())->toBe(10_000_000);
});

test('la clave de idempotencia evita pagos duplicados por doble envío', function () {
    $key = (string) Str::uuid();

    $payload = [
        'amount' => '50000',
        'paid_on' => now()->toDateString(),
        'idempotency_key' => $key,
    ];

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$this->appointment->id}/pagos", $payload)
        ->assertSessionHasNoErrors();

    $this->actingAs($this->admin)
        ->post("/admin/solicitudes/{$this->appointment->id}/pagos", $payload)
        ->assertSessionHasNoErrors();

    expect(Payment::query()->count())->toBe(1);
    expect($this->appointment->refresh()->totalPaidCents())->toBe(5_000_000);
});

test('un pago se anula con motivo y deja de contar sin borrarse', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/pagos", [
        'amount' => '100000',
        'paid_on' => now()->toDateString(),
    ])->assertSessionHasNoErrors();

    $payment = Payment::query()->firstOrFail();

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/pagos/{$payment->id}/anular", [
        'reason' => 'Se registró en la cita equivocada.',
    ])->assertSessionHasNoErrors();

    $payment->refresh();

    expect($payment->voided_at)->not->toBeNull();
    expect($payment->void_reason)->toBe('Se registró en la cita equivocada.');
    expect($payment->voided_by)->toBe($this->admin->id);
    expect($payment->amount_cents)->toBe(10_000_000);
    expect($this->appointment->refresh()->totalPaidCents())->toBe(0);
    expect($this->appointment->paymentStatus())->toBe(AppointmentRequest::PAYMENT_UNPAID);
});

test('no se registran pagos nuevos en una cita cancelada', function () {
    $this->appointment->update(['status' => AppointmentRequest::STATUS_CANCELLED]);

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/pagos", [
        'amount' => '50000',
        'paid_on' => now()->toDateString(),
    ])->assertSessionHasErrors('payment_amount');

    expect(Payment::query()->count())->toBe(0);
});

test('marcar una cita como atendida conserva el saldo pendiente', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/atender", [
        'register_payment' => false,
    ])->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect($this->appointment->status)->toBe(AppointmentRequest::STATUS_ATTENDED);
    expect($this->appointment->attended_at)->not->toBeNull();
    expect($this->appointment->balanceCents())->toBe(10_000_000);
});

test('marcar como atendida puede registrar el pago en la misma acción', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/atender", [
        'register_payment' => true,
        'payment_amount' => '100000',
        'payment_paid_on' => now()->toDateString(),
        'payment_method' => 'transfer',
    ])->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect($this->appointment->status)->toBe(AppointmentRequest::STATUS_ATTENDED);
    expect($this->appointment->totalPaidCents())->toBe(10_000_000);
    expect($this->appointment->paymentStatus())->toBe(AppointmentRequest::PAYMENT_PAID);
});

test('una cita atendida no puede marcarse dos veces ni cancelarse', function () {
    $this->appointment->update([
        'status' => AppointmentRequest::STATUS_ATTENDED,
        'attended_at' => now(),
    ]);

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/atender", [
        'register_payment' => false,
    ])->assertSessionHasErrors('status');

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/cancelar")
        ->assertSessionHas('flash');

    expect($this->appointment->refresh()->status)->toBe(AppointmentRequest::STATUS_ATTENDED);
});

test('marcar una cita como no realizada conserva el historial', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/no-realizada")
        ->assertSessionHasNoErrors();

    $this->appointment->refresh();

    expect($this->appointment->status)->toBe(AppointmentRequest::STATUS_NO_SHOW);
    expect($this->appointment->no_show_at)->not->toBeNull();
    expect($this->appointment->confirmed_start)->not->toBeNull();
});

test('el detalle de la cita incluye paciente, pagos y estado financiero', function () {
    $this->actingAs($this->admin)->post("/admin/solicitudes/{$this->appointment->id}/pagos", [
        'amount' => '25000',
        'paid_on' => now()->toDateString(),
        'method' => 'transfer',
        'notes' => 'Abono inicial',
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)
        ->get("/admin/solicitudes/{$this->appointment->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/requests/show')
            ->where('appointment.patient.id', $this->patient->id)
            ->where('appointment.service_value_cents', 10_000_000)
            ->where('appointment.total_paid_cents', 2_500_000)
            ->where('appointment.balance_cents', 7_500_000)
            ->where('appointment.payment_status', AppointmentRequest::PAYMENT_PARTIAL)
            ->where('appointment.payments.0.amount_cents', 2_500_000)
            ->where('appointment.payments.0.recorded_by_name', $this->admin->name)
        );
});

test('el valor acordado no puede reducirse por debajo de lo ya pagado', function () {
    Payment::create([
        'appointment_id' => $this->appointment->id,
        'amount_cents' => 6_000_000,
        'paid_on' => now()->toDateString(),
        'recorded_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)->patch("/admin/solicitudes/{$this->appointment->id}", [
        'duration_minutes' => 60,
        'service_value' => '50000',
        'notes' => '',
    ])->assertSessionHasErrors('service_value');

    expect($this->appointment->refresh()->service_value_cents)->toBe(10_000_000);
});
