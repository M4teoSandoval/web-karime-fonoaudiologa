<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Inertia
    |--------------------------------------------------------------------------
    |
    | Este proyecto guarda sus páginas en "resources/js/pages" (en minúsculas),
    | por lo que se indican las rutas y extensiones reales para que las
    | aserciones de pruebas (assertInertia) encuentren los componentes.
    |
    | El resto de la configuración de Inertia conserva los valores por defecto
    | del paquete.
    |
    */

    'testing' => [

        'ensure_pages_exist' => true,

        'page_paths' => [
            resource_path('js/pages'),
        ],

        'page_extensions' => [
            'js',
            'jsx',
            'svelte',
            'ts',
            'tsx',
            'vue',
        ],

    ],

];
