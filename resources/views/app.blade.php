<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!--
            Dancing Script se sirve autoalojada desde /public/fonts
            (ver resources/css/app.css). La hoja de fonts.bunny.net
            anterior cargaba "instrument-sans", una familia que no se
            usaba en ningún lugar de la web: solo sumaba una petición
            bloqueante en cada carga.
        -->
        <link rel="preload" href="/fonts/dancing-script.woff2" as="font" type="font/woff2" crossorigin>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
