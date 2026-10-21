<?php

/*
|--------------------------------------------------------------------------
| Datos públicos del sitio
|--------------------------------------------------------------------------
|
| Información de marca y de contacto que usan tanto el backend (sitemap,
| datos estructurados) como el frontend (Open Graph, canonical, enlaces).
| Los valores por defecto apuntan al dominio real de producción, de modo que
| el sitio funciona correctamente sin variables de entorno adicionales.
|
*/

return [
    'url' => env('SITE_URL', 'https://fonoaudiokarime.com'),

    'name' => env('SITE_NAME', 'Karime Sandoval'),

    // Teléfono de contacto (WhatsApp), en formato internacional sin signos.
    'phone' => env('WHATSAPP_NUMBER', '573150596654'),

    // Ficha del consultorio en Google Maps (Google Business Profile).
    'maps_url' => env('SITE_MAPS_URL', 'https://maps.app.goo.gl/Q9D2mgrLzNb7z1k27'),

    /*
        Metadatos SEO de la portada. Se renderizan en el servidor
        (resources/views/app.blade.php) para que estén presentes en el HTML
        inicial, sin depender de JavaScript.
    */
    'seo' => [
        'title' => 'Karime Sandoval | Fonoaudióloga en Santa Rosa del Sur, Bolívar',
        'description' => 'Karime Sandoval, fonoaudióloga en Santa Rosa del Sur, Bolívar. Terapia del lenguaje, habla, voz y deglución, limpieza de oídos, rehabilitación vestibular y protectores auditivos a la medida. Agenda tu cita.',
    ],

    // Datos de la profesional, usados en los datos estructurados (JSON-LD).
    'professional' => [
        'name' => 'Karime Sandoval',
        'full_name' => 'Karime Natalia Sandoval Barreto',
        'job_title' => 'Fonoaudióloga',
        'street_address' => 'Calle 10 #8A-90',
        'locality' => 'Santa Rosa del Sur',
        'region' => 'Bolívar',
        'country' => 'CO',
        'instagram' => 'https://www.instagram.com/karime.fonoaudio/',
        'image' => '/images/karime/karime_profesional.webp',
        // Imagen para vistas previas (Open Graph): formato con mejor soporte.
        'social_image' => '/images/karime/karime_profesional.jpeg',
    ],
];
