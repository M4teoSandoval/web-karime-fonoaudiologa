<?php

use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-05-15 10:00:00');

    $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this->patient = Patient::create([
        'name' => 'Paciente Financiero',
        'phone' => '3000000000',
        'phone_normalized' => '3000000000',
    ]);

    // La cita se realizó en junio, pero los pagos se registraron en abril y
    // mayo: los ingresos deben seguir la fecha efectiva del pago.
    $this->appointment = AppointmentRequest::factory()->confirmed('2026-06-20 09:00:00', 60)->create([
        'patient_id' => $this->patient->id,
        'patient_name' => $this->patient->name,
        'status' => AppointmentRequest::STATUS_ATTENDED,
        'attended_at' => '2026-05-10 09:00:00',
        'service_value_cents' => 20_000_000,
    ]);

    Payment::create([
        'appointment_id' => $this->appointment->id,
        'amount_cents' => 6_000_000,
        'paid_on' => '2026-05-10',
        'method' => 'transfer',
        'recorded_by' => $this->admin->id,
    ]);

    Payment::create([
        'appointment_id' => $this->appointment->id,
        'amount_cents' => 5_000_000,
        'paid_on' => '2026-04-10',
        'method' => 'cash',
        'recorded_by' => $this->admin->id,
    ]);

    // Un pago anulado no cuenta como ingreso.
    Payment::create([
        'appointment_id' => $this->appointment->id,
        'amount_cents' => 3_000_000,
        'paid_on' => '2026-05-12',
        'voided_at' => now(),
        'void_reason' => 'Pago duplicado.',
        'voided_by' => $this->admin->id,
    ]);
});

afterEach(function () {
    Carbon::setTestNow();
});

test('el dashboard calcula los ingresos del mes por fecha efectiva del pago', function () {
    $this->actingAs($this->admin)
        ->get('/admin?month=2026-05')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/dashboard')
            ->where('period', '2026-05')
            ->where('period_label', 'Mayo de 2026')
            ->where('finance.income_cents', 6_000_000)
            ->where('finance.previous_income_cents', 5_000_000)
            ->where('finance.variation_percent', 20)
            ->where('finance.attended_count', 1)
            ->where('finance.attended_patients_count', 1)
            ->where('finance.outstanding_cents', 9_000_000)
        );
});

test('el dashboard compara con el mes anterior y permite cambiar de periodo', function () {
    $this->actingAs($this->admin)
        ->get('/admin?month=2026-04')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('period', '2026-04')
            ->where('period_label', 'Abril de 2026')
            ->where('finance.income_cents', 5_000_000)
            ->where('finance.previous_income_cents', 0)
            ->where('finance.variation_percent', null)
            ->where('finance.attended_count', 0)
        );
});

test('el resumen mensual incluye seis meses e ignora pagos anulados', function () {
    $this->actingAs($this->admin)
        ->get('/admin?month=2026-05')
        ->assertInertia(fn ($page) => $page
            ->has('monthly', 6)
            ->where('monthly.0.period', '2025-12')
            ->where('monthly.5.period', '2026-05')
            ->where('monthly.5.income_cents', 6_000_000)
            ->where('monthly.4.income_cents', 5_000_000)
            ->where('monthly.5.attended_count', 1)
        );
});

test('un periodo inválido vuelve al mes actual sin fallar', function () {
    $this->actingAs($this->admin)
        ->get('/admin?month=mes-invalido')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('period', '2026-05'));
});
