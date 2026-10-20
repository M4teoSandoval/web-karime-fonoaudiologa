<?php

use App\Models\AppointmentRequest;
use App\Models\User;

test('un visitante puede enviar una solicitud de cita y recibe el enlace de WhatsApp', function () {
    $response = $this->post('/agendar-cita', [
        'patient_name' => 'María Pérez',
        'service' => 'Terapia de Lenguaje',
    ]);

    $this->assertDatabaseHas('appointment_requests', [
        'patient_name' => 'María Pérez',
        'service' => 'Terapia de Lenguaje',
        'status' => AppointmentRequest::STATUS_PENDING,
    ]);

    $response->assertSessionHas('flash');

    $flash = session('flash');

    expect($flash['type'])->toBe('success');
    expect($flash['whatsapp_url'])->toContain('https://wa.me/');
    expect(rawurldecode($flash['whatsapp_url']))->toContain('María Pérez')->toContain('Terapia de Lenguaje');
});

test('el nombre es requerido y se validan los datos', function () {
    $response = $this->from('/')->post('/agendar-cita', [
        'patient_name' => '',
        'service' => 'Terapia de Lenguaje',
    ]);

    $response->assertSessionHasErrors('patient_name');
    $this->assertDatabaseCount('appointment_requests', 0);
});

test('el servicio debe pertenecer al catálogo oficial', function () {
    $response = $this->from('/')->post('/agendar-cita', [
        'patient_name' => 'María Pérez',
        'service' => 'Servicio Inexistente',
    ]);

    $response->assertSessionHasErrors('service');
    $this->assertDatabaseCount('appointment_requests', 0);
});

test('el registro fallido no ofrece enlace de WhatsApp', function () {
    // Simula un servicio inválido: nunca se crea el registro ni se ofrece WhatsApp.
    $response = $this->from('/')->post('/agendar-cita', [
        'patient_name' => '',
        'service' => '',
    ]);

    $response->assertSessionHasErrors(['patient_name', 'service']);
    expect(session('flash'))->toBeNull();
});

test('ya no existe registro público de administradores', function () {
    $this->get('/register')->assertNotFound();
});

test('las rutas del panel requieren autenticación', function () {
    $this->get('/admin')->assertRedirect(route('login'));
    $this->get('/admin/solicitudes')->assertRedirect(route('login'));
    $this->get('/admin/agenda')->assertRedirect(route('login'));
    $this->get('/admin/horarios')->assertRedirect(route('login'));
});

test('un usuario autenticado sin rol admin no puede acceder al panel', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/admin')->assertForbidden();
    $this->actingAs($user)->get('/admin/solicitudes')->assertForbidden();
});

test('un usuario admin puede acceder al panel', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this->actingAs($admin)->get('/admin')->assertOk();
    $this->actingAs($admin)->get('/admin/solicitudes')->assertOk();
    $this->actingAs($admin)->get('/admin/agenda')->assertOk();
    $this->actingAs($admin)->get('/admin/horarios')->assertOk();
});
