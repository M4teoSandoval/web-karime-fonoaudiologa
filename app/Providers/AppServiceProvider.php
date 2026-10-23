<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fuerza HTTPS para todas las URLs generadas (assets de Vite incluidos)
        // cuando la URL pública configurada es HTTPS. Se basa en "APP_URL" y no
        // en el valor de "APP_ENV", porque el entorno en el servidor puede no
        // coincidir exactamente con el string "production" y el esquema forzado
        // no llegaría a aplicarse. En local "APP_URL" usa "http://", por lo que
        // no se fuerza nada y el entorno de desarrollo sigue funcionando por HTTP.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
