<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Páginas públicas que Google debe indexar.
     *
     * Solo se incluyen rutas reales y públicas. El panel de administración,
     * el dashboard y las rutas de autenticación quedan fuera: son privadas y
     * además están marcadas como "noindex".
     *
     * @var list<array{loc: string, changefreq: string, priority: string}>
     */
    private const PUBLIC_URLS = [
        [
            'loc' => '/',
            'changefreq' => 'monthly',
            'priority' => '1.0',
        ],
    ];

    /**
     * Fecha de la última modificación relevante del contenido público.
     *
     * La portada solo cambia cuando se publica contenido nuevo, por lo que
     * se actualiza este valor en cada cambio de contenido de la web.
     */
    private const LAST_MODIFIED = '2026-10-21';

    /**
     * Mapa XML con las URLs absolutas del sitio.
     */
    public function __invoke(): Response
    {
        $baseUrl = rtrim((string) config('site.url'), '/');

        $urls = collect(self::PUBLIC_URLS)
            ->map(fn (array $url) => "    <url>\n"
                ."        <loc>{$baseUrl}{$url['loc']}</loc>\n"
                .'        <lastmod>'.self::LAST_MODIFIED."</lastmod>\n"
                ."        <changefreq>{$url['changefreq']}</changefreq>\n"
                ."        <priority>{$url['priority']}</priority>\n"
                .'    </url>')
            ->implode("\n");

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .$urls."\n"
            .'</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }
}
