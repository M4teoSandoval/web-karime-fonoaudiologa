<?php

use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Railway termina el TLS en su proxy y reenvía la petición por HTTP
        // interno, añadiendo la cabecera "X-Forwarded-Proto". Sin confiar en el
        // proxy, Laravel ve la petición como HTTP y "asset()" (usado por el
        // componente Vite) genera las URL de CSS/JS con "http://", lo que
        // provoca el error "Mixed Content" en el navegador.
        //
        // Se confía en el proxy para que "request()->isSecure()" refleje el
        // esquema real. El host de las URLs generadas NO sale de la cabecera
        // "Host" del cliente sino de "config('app.url')", por lo que esta
        // configuración no expone a inyección de host.
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
