<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Crea (o actualiza) el usuario administrador a partir de variables
     * de entorno. No hay registro público de administradores.
     *
     * Requiere en .env:
     *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command?->warn(
                'AdminUserSeeder omitido: define ADMIN_EMAIL y ADMIN_PASSWORD en .env para crear el usuario administrador.'
            );

            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Karime Sandoval'),
                'password' => $password,
                'role' => User::ROLE_ADMIN,
            ],
        );

        $this->command?->info("Usuario administrador listo: {$email}");
    }
}
