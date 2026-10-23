<?php

use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\PatientNote;
use App\Models\Payment;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this->patient = Patient::create([
        'name' => 'Lucía Gómez',
        'phone' => '+57 300 111 2233',
        'phone_normalized' => Patient::normalizePhone('+57 300 111 2233'),
    ]);

    $this->appointment = AppointmentRequest::factory()->confirmed(nextWeekday('09:00:00'), 60)->create([
        'patient_id' => $this->patient->id,
        'patient_name' => $this->patient->name,
        'patient_phone' => $this->patient->phone,
        'service_value_cents' => 8_000_000,
    ]);

    Payment::create([
        'appointment_id' => $this->appointment->id,
        'amount_cents' => 3_000_000,
        'paid_on' => now()->toDateString(),
        'method' => 'cash',
        'recorded_by' => $this->admin->id,
    ]);
});

test('el listado de pacientes se puede buscar por nombre y por teléfono', function () {
    Patient::create([
        'name' => 'Otro Paciente',
        'phone' => '3009998877',
        'phone_normalized' => '3009998877',
    ]);

    $this->actingAs($this->admin)
        ->get('/admin/pacientes?q=Lucía')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/patients/index')
            ->where('pagination.total', 1)
            ->where('patients.0.name', 'Lucía Gómez')
        );

    $this->actingAs($this->admin)
        ->get('/admin/pacientes?q=3001112233')
        ->assertInertia(fn ($page) => $page
            ->where('pagination.total', 1)
            ->where('patients.0.id', $this->patient->id)
        );
});

test('el perfil del paciente muestra citas, pagos y saldo', function () {
    $this->actingAs($this->admin)
        ->get("/admin/pacientes/{$this->patient->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/patients/show')
            ->where('patient.id', $this->patient->id)
            ->where('summary.appointments_count', 1)
            ->where('summary.total_paid_cents', 3_000_000)
            ->where('summary.outstanding_cents', 5_000_000)
            ->where('appointments.0.id', $this->appointment->id)
            ->where('payments.0.amount_cents', 3_000_000)
        );
});

test('editar los datos del paciente actualiza sus citas sin tocar importes', function () {
    $this->actingAs($this->admin)->patch("/admin/pacientes/{$this->patient->id}", [
        'name' => 'Lucía Gómez Ríos',
        'phone' => '301 222 3344',
    ])->assertSessionHasNoErrors();

    $this->patient->refresh();
    $this->appointment->refresh();

    expect($this->patient->name)->toBe('Lucía Gómez Ríos');
    expect($this->patient->phone_normalized)->toBe('3012223344');
    expect($this->appointment->patient_name)->toBe('Lucía Gómez Ríos');
    expect($this->appointment->patient_phone)->toBe('301 222 3344');
    expect($this->appointment->service_value_cents)->toBe(8_000_000);
});

test('se agrega una nota privada vinculada a una cita del paciente', function () {
    $today = now()->toDateString();

    $this->actingAs($this->admin)->post("/admin/pacientes/{$this->patient->id}/notas", [
        'body' => 'Se recomendó continuar con ejercicios diarios.',
        'noted_at' => $today,
        'appointment_id' => $this->appointment->id,
    ])->assertSessionHasNoErrors();

    $note = PatientNote::query()->firstOrFail();

    expect($note->patient_id)->toBe($this->patient->id);
    expect($note->appointment_id)->toBe($this->appointment->id);
    expect($note->created_by)->toBe($this->admin->id);
    expect($note->body)->toBe('Se recomendó continuar con ejercicios diarios.');
});

test('no se puede vincular una nota a una cita de otro paciente', function () {
    $otherPatient = Patient::create([
        'name' => 'Otro Paciente',
        'phone' => '3110000000',
        'phone_normalized' => '3110000000',
    ]);

    $otherAppointment = AppointmentRequest::factory()->confirmed(nextWeekday('10:00:00'), 60)->create([
        'patient_id' => $otherPatient->id,
        'patient_name' => $otherPatient->name,
    ]);

    $this->actingAs($this->admin)->post("/admin/pacientes/{$this->patient->id}/notas", [
        'body' => 'Nota mal vinculada.',
        'noted_at' => now()->toDateString(),
        'appointment_id' => $otherAppointment->id,
    ])->assertSessionHasErrors('appointment_id');

    expect(PatientNote::query()->count())->toBe(0);
});

test('editar una nota conserva la versión anterior en el historial', function () {
    $note = PatientNote::create([
        'patient_id' => $this->patient->id,
        'appointment_id' => $this->appointment->id,
        'body' => 'Versión original.',
        'noted_at' => now()->toDateString(),
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)->patch("/admin/pacientes/{$this->patient->id}/notas/{$note->id}", [
        'body' => 'Versión corregida.',
    ])->assertSessionHasNoErrors();

    $note->refresh();

    expect($note->body)->toBe('Versión corregida.');
    expect($note->revisions)->toHaveCount(1);
    expect($note->revisions->first()->body)->toBe('Versión original.');
    expect($note->revisions->first()->edited_by)->toBe($this->admin->id);
});

test('el historial de notas se muestra en el perfil del paciente', function () {
    $note = PatientNote::create([
        'patient_id' => $this->patient->id,
        'body' => 'Nota de seguimiento.',
        'noted_at' => now()->toDateString(),
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->get("/admin/pacientes/{$this->patient->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notes.0.id', $note->id)
            ->where('notes.0.body', 'Nota de seguimiento.')
        );
});

test('las notas y el perfil del paciente no son accesibles sin autenticación', function () {
    $this->get("/admin/pacientes/{$this->patient->id}")->assertRedirect(route('login'));
    $this->post("/admin/pacientes/{$this->patient->id}/notas", [
        'body' => 'Intento anónimo.',
        'noted_at' => now()->toDateString(),
    ])->assertRedirect(route('login'));

    expect(PatientNote::query()->count())->toBe(0);
});

test('una solicitud pública se puede vincular manualmente a un paciente', function () {
    $public = AppointmentRequest::factory()->create([
        'patient_name' => 'Solicitud Web',
        'patient_phone' => null,
    ]);

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$public->id}/paciente", [
        'patient_id' => $this->patient->id,
    ])->assertSessionHasNoErrors();

    $public->refresh();

    expect($public->patient_id)->toBe($this->patient->id);
    expect($public->patient_name)->toBe($this->patient->name);
    expect($public->patient_phone)->toBe($this->patient->phone);
});

test('vincular una solicitud puede crear un paciente nuevo', function () {
    $public = AppointmentRequest::factory()->create(['patient_name' => 'Paciente Web']);

    $this->actingAs($this->admin)->post("/admin/solicitudes/{$public->id}/paciente", [
        'patient_name' => 'Paciente Web',
        'patient_phone' => '320 444 5566',
    ])->assertSessionHasNoErrors();

    $public->refresh();

    expect($public->patient_id)->not->toBeNull();
    expect($public->patient->phone_normalized)->toBe('3204445566');
});

test('la búsqueda de pacientes responde JSON para el selector del panel', function () {
    $this->actingAs($this->admin)
        ->getJson('/admin/pacientes/buscar?q=Luc')
        ->assertOk()
        ->assertJsonPath('patients.0.id', $this->patient->id)
        ->assertJsonPath('patients.0.name', 'Lucía Gómez');
});
