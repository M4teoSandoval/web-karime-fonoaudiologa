<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'email' => 'karime@example.com',
    ]);
});

test('la página de cuenta se muestra dentro del panel', function () {
    $this->actingAs($this->admin)
        ->get('/admin/cuenta')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/account'));
});

test('solo los administradores acceden a la cuenta del panel', function () {
    $this->get('/admin/cuenta')->assertRedirect('/login');

    $this->actingAs(User::factory()->create())
        ->get('/admin/cuenta')
        ->assertForbidden();
});

test('actualiza el nombre y normaliza el correo', function () {
    $this->actingAs($this->admin)
        ->from('/admin/cuenta')
        ->patch('/admin/cuenta', [
            'name' => '  Karime S.  ',
            'email' => 'NUEVO@Example.com',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/admin/cuenta')
        ->assertSessionHas('flash.type', 'success');

    $this->admin->refresh();

    expect($this->admin->name)->toBe('Karime S.')
        ->and($this->admin->email)->toBe('nuevo@example.com')
        ->and($this->admin->role)->toBe(User::ROLE_ADMIN);
});

test('no permite usar un correo que ya tiene otra cuenta', function () {
    User::factory()->create(['email' => 'ocupado@example.com']);

    $this->actingAs($this->admin)
        ->from('/admin/cuenta')
        ->patch('/admin/cuenta', ['name' => 'Karime', 'email' => 'ocupado@example.com'])
        ->assertSessionHasErrors(['email' => 'Ese correo electrónico ya está en uso.']);

    expect($this->admin->refresh()->email)->toBe('karime@example.com');
});

test('el rol no se puede cambiar desde el formulario de cuenta', function () {
    $this->actingAs($this->admin)
        ->patch('/admin/cuenta', ['name' => 'Karime', 'email' => 'karime@example.com', 'role' => User::ROLE_USER]);

    expect($this->admin->refresh()->role)->toBe(User::ROLE_ADMIN);
});

test('cambia la contraseña con la contraseña actual correcta', function () {
    $this->actingAs($this->admin)
        ->from('/admin/cuenta')
        ->put('/admin/cuenta/contrasena', [
            'current_password' => 'password',
            'password' => 'nueva-clave-segura',
            'password_confirmation' => 'nueva-clave-segura',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/admin/cuenta');

    expect(Hash::check('nueva-clave-segura', $this->admin->refresh()->password))->toBeTrue();
});

test('rechaza el cambio si la contraseña actual es incorrecta', function () {
    $this->actingAs($this->admin)
        ->from('/admin/cuenta')
        ->put('/admin/cuenta/contrasena', [
            'current_password' => 'incorrecta',
            'password' => 'nueva-clave-segura',
            'password_confirmation' => 'nueva-clave-segura',
        ])
        ->assertSessionHasErrors(['current_password' => 'La contraseña actual no es correcta.']);

    expect(Hash::check('password', $this->admin->refresh()->password))->toBeTrue();
});

test('muestra en español el error de contraseña demasiado corta', function () {
    $this->actingAs($this->admin)
        ->from('/admin/cuenta')
        ->put('/admin/cuenta/contrasena', [
            'current_password' => 'password',
            'password' => 'corta',
            'password_confirmation' => 'corta',
        ])
        ->assertSessionHasErrors(['password' => 'La nueva contraseña debe tener al menos 8 caracteres.']);
});

test('las rutas del starter kit ya no existen', function (string $uri) {
    $this->actingAs($this->admin)->get($uri)->assertNotFound();
})->with(['/dashboard', '/settings/profile', '/settings/password', '/settings/appearance', '/verify-email', '/confirm-password']);
