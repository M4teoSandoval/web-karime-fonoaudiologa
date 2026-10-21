<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ request()->routeIs('home') ? config('site.seo.title') : config('app.name', 'Karime Sandoval') }}</title>

        @if (request()->routeIs('home'))
            {{--
                Metadatos SEO de la portada renderizados en el servidor para que
                estén presentes en el HTML inicial, sin depender de JavaScript
                (importante para buscadores y vistas previas de redes sociales).
                Los valores vienen de config/site.php.
            --}}
            <meta name="description" content="{{ config('site.seo.description') }}">
            <meta name="robots" content="index, follow, max-image-preview:large">
            <meta name="author" content="{{ config('site.professional.name') }}">

            <link rel="canonical" href="{{ rtrim(config('site.url'), '/') }}/">

            <meta property="og:type" content="website">
            <meta property="og:locale" content="es_CO">
            <meta property="og:site_name" content="{{ config('site.name') }}">
            <meta property="og:title" content="{{ config('site.seo.title') }}">
            <meta property="og:description" content="{{ config('site.seo.description') }}">
            <meta property="og:url" content="{{ rtrim(config('site.url'), '/') }}/">
            <meta property="og:image" content="{{ rtrim(config('site.url'), '/') }}{{ config('site.professional.social_image') }}">
            <meta property="og:image:alt" content="{{ config('site.professional.name') }}, {{ config('site.professional.job_title') }} en {{ config('site.professional.locality') }}, {{ config('site.professional.region') }}">

            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="{{ config('site.seo.title') }}">
            <meta name="twitter:description" content="{{ config('site.seo.description') }}">
            <meta name="twitter:image" content="{{ rtrim(config('site.url'), '/') }}{{ config('site.professional.social_image') }}">
        @endif

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
