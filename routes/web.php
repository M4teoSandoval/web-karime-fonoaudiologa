<?php

use App\Http\Controllers\AppointmentRequestController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

/*
    Mapa del sitio para los buscadores. Solo incluye páginas públicas reales.
*/
Route::get('sitemap.xml', SitemapController::class)->name('sitemap');

Route::post('agendar-cita', [AppointmentRequestController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('appointments.store');

require __DIR__.'/admin.php';
require __DIR__.'/auth.php';
