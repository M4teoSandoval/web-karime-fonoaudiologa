<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Karime Sandoval') }}</title>

        <link rel="icon" type="image/png" href="/images/branding/logo-karime-sandoval.png">

        <!--
            Las tipografías se sirven autoalojadas desde /public/fonts
            (ver resources/css/app.css): Dhyana 400/700 como tipografía
            principal y Bad Script 400 como acento decorativo.
            Los preloads evitan el parpadeo de texto (font-display: swap)
            en la primera pintura, y al ser rutas relativas del mismo
            dominio se cargan por HTTPS sin mixed content en Safari.
        -->
        <link rel="preload" href="/fonts/dhyana-400.woff2" as="font" type="font/woff2" crossorigin>
        <link rel="preload" href="/fonts/dhyana-700.woff2" as="font" type="font/woff2" crossorigin>
        <link rel="preload" href="/fonts/bad-script-400.woff2" as="font" type="font/woff2" crossorigin>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
