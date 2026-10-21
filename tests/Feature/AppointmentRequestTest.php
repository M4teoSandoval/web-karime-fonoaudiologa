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

test('el paciente puede solicitar un servicio personalizado', function () {
    $this->post('/agendar-cita', [
        'patient_name' => 'Mateo Sandoval',
        'service' => AppointmentRequest::OTHER_SERVICE,
        'custom_service' => 'Drenaje lingual',
    ]);

    $this->assertDatabaseHas('appointment_requests', [
        'patient_name' => 'Mateo Sandoval',
        'service' => 'Drenaje lingual',
        'status' => AppointmentRequest::STATUS_PENDING,
    ]);

    $flash = session('flash');

    expect($flash['type'])->toBe('success');
    expect(rawurldecode($flash['whatsapp_url']))->toContain('Drenaje lingual');
});

test('el servicio personalizado es obligatorio cuando se elige "Otro servicio"', function () {
    $this->from('/')->post('/agendar-cita', [
        'patient_name' => 'Mateo Sandoval',
        'service' => AppointmentRequest::OTHER_SERVICE,
    ])->assertSessionHasErrors('custom_service');

    $this->assertDatabaseCount('appointment_requests', 0);
});

test('un texto vacío o con solo espacios no cuenta como servicio personalizado', function () {
    $this->from('/')->post('/agendar-cita', [
        'patient_name' => 'Mateo Sandoval',
        'service' => AppointmentRequest::OTHER_SERVICE,
        'custom_service' => '   ',
    ])->assertSessionHasErrors('custom_service');

    $this->assertDatabaseCount('appointment_requests', 0);
});

test('un servicio del catálogo ignora el campo de servicio personalizado', function () {
    $this->post('/agendar-cita', [
        'patient_name' => 'María Pérez',
        'service' => 'Terapia de Lenguaje',
        'custom_service' => '',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('appointment_requests', [
        'patient_name' => 'María Pérez',
        'service' => 'Terapia de Lenguaje',
    ]);
});

test('el servicio personalizado se limita a 100 caracteres', function () {
    $this->from('/')->post('/agendar-cita', [
        'patient_name' => 'Mateo Sandoval',
        'service' => AppointmentRequest::OTHER_SERVICE,
        'custom_service' => str_repeat('a', 101),
    ])->assertSessionHasErrors('custom_service');

    $this->assertDatabaseCount('appointment_requests', 0);
});

test('los protectores auditivos son el primer servicio del catálogo', function () {
    expect(AppointmentRequest::SERVICES[0])->toBe('Protectores auditivos');
});

test('el sitemap está disponible con URLs absolutas y sin rutas privadas', function () {
    $response = $this->get('/sitemap.xml');

    $response->assertOk();

    $xml = $response->getContent();

    expect($xml)->toContain('<loc>https://fonoaudiokarime.com/</loc>');
    expect($xml)->not->toContain('/admin');
    expect($xml)->not->toContain('/login');
    expect($xml)->not->toContain('http://localhost');

    $parsed = simplexml_load_string($xml);

    expect($parsed)->not->toBeFalse();
    expect(count($parsed->url))->toBe(1);
});

test('el robots.txt permite rastrear el sitio y apunta al sitemap', function () {
    $robots = file_get_contents(public_path('robots.txt'));

    expect($robots)->toContain('User-agent: *');
    expect($robots)->toContain('Allow: /');
    expect($robots)->toContain('Sitemap: https://fonoaudiokarime.com/sitemap.xml');

    // No se bloquean los recursos (CSS/JS/fuentes) que Google necesita.
    expect($robots)->not->toContain('Disallow: /assets');
    expect($robots)->not->toContain('Disallow: /build');
    expect($robots)->not->toContain('Disallow: /fonts');
});

test('la portada renderiza los metadatos SEO en el servidor', function () {
    $response = $this->get('/');

    $response->assertOk();

    $html = $response->getContent();

    expect($html)->toContain('<html lang="es">');
    expect($html)->toContain('Karime Sandoval | Fonoaudióloga en Santa Rosa del Sur, Bolívar');
    expect($html)->toContain('rel="canonical"');
    expect($html)->toContain('https://fonoaudiokarime.com/');
    expect($html)->toContain('og:title');
    expect($html)->not->toContain('noindex');
});

test('el enlace de Maps apunta a la ficha del consultorio en Google', function () {
    expect(config('site.maps_url'))->toBe('https://maps.app.goo.gl/Q9D2mgrLzNb7z1k27');

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('site.maps_url', 'https://maps.app.goo.gl/Q9D2mgrLzNb7z1k27')
        );
});
