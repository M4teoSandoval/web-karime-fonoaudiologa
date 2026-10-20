<?php

use App\Http\Controllers\Admin\AgendaController;
use App\Http\Controllers\Admin\AppointmentRequestController;
use App\Http\Controllers\Admin\AvailabilityBlockController;
use App\Http\Controllers\Admin\AvailabilityController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\WorkScheduleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Panel administrativo
|--------------------------------------------------------------------------
|
| Rutas reservadas a usuarios autenticados con rol "admin". No existe
| registro público de administradores: el usuario se crea mediante
| el seeder AdminUserSeeder con variables de entorno.
|
*/

Route::middleware(['auth', 'admin'])->prefix('admin')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('admin.dashboard');

    // Solicitudes de citas.
    Route::get('solicitudes', [AppointmentRequestController::class, 'index'])->name('admin.requests.index');
    Route::get('solicitudes/{appointment}', [AppointmentRequestController::class, 'show'])->name('admin.requests.show');
    Route::patch('solicitudes/{appointment}', [AppointmentRequestController::class, 'update'])->name('admin.requests.update');
    Route::post('solicitudes/{appointment}/proponer', [AppointmentRequestController::class, 'propose'])->name('admin.requests.propose');
    Route::post('solicitudes/{appointment}/confirmar', [AppointmentRequestController::class, 'confirm'])->name('admin.requests.confirm');
    Route::post('solicitudes/{appointment}/cancelar', [AppointmentRequestController::class, 'cancel'])->name('admin.requests.cancel');

    // Disponibilidad (JSON para el panel).
    Route::get('disponibilidad', [AvailabilityController::class, 'show'])->name('admin.availability.show');

    // Agenda semanal.
    Route::get('agenda', [AgendaController::class, 'index'])->name('admin.agenda');

    // Horarios de atención y bloqueos.
    Route::get('horarios', [WorkScheduleController::class, 'index'])->name('admin.schedule.index');
    Route::put('horarios', [WorkScheduleController::class, 'update'])->name('admin.schedule.update');
    Route::post('bloqueos', [AvailabilityBlockController::class, 'store'])->name('admin.blocks.store');
    Route::delete('bloqueos/{block}', [AvailabilityBlockController::class, 'destroy'])->name('admin.blocks.destroy');
});
