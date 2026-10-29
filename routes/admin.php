<?php

use App\Http\Controllers\Admin\AgendaController;
use App\Http\Controllers\Admin\AppointmentController;
use App\Http\Controllers\Admin\AppointmentRequestController;
use App\Http\Controllers\Admin\AvailabilityBlockController;
use App\Http\Controllers\Admin\AvailabilityController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PatientController;
use App\Http\Controllers\Admin\PatientNoteController;
use App\Http\Controllers\Admin\PaymentController;
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

    // Citas manuales (creadas desde la agenda).
    Route::post('citas', [AppointmentController::class, 'store'])->name('admin.appointments.store');

    // Solicitudes de citas.
    Route::get('solicitudes', [AppointmentRequestController::class, 'index'])->name('admin.requests.index');
    Route::get('solicitudes/{appointment}', [AppointmentRequestController::class, 'show'])->name('admin.requests.show');
    Route::patch('solicitudes/{appointment}', [AppointmentRequestController::class, 'update'])->name('admin.requests.update');
    Route::post('solicitudes/{appointment}/proponer', [AppointmentRequestController::class, 'propose'])->name('admin.requests.propose');
    Route::post('solicitudes/{appointment}/confirmar', [AppointmentRequestController::class, 'confirm'])->name('admin.requests.confirm');
    Route::post('solicitudes/{appointment}/reprogramar', [AppointmentController::class, 'reschedule'])->name('admin.requests.reschedule');
    Route::post('solicitudes/{appointment}/cancelar', [AppointmentRequestController::class, 'cancel'])->name('admin.requests.cancel');
    Route::post('solicitudes/{appointment}/atender', [AppointmentController::class, 'markAttended'])->name('admin.requests.attend');
    Route::post('solicitudes/{appointment}/no-realizada', [AppointmentController::class, 'markNoShow'])->name('admin.requests.no-show');
    Route::post('solicitudes/{appointment}/paciente', [AppointmentController::class, 'assignPatient'])->name('admin.requests.assign-patient');

    // Pagos y abonos de una cita.
    Route::post('solicitudes/{appointment}/pagos', [PaymentController::class, 'store'])->name('admin.requests.payments.store');
    Route::post('solicitudes/{appointment}/pagos/{payment}/anular', [PaymentController::class, 'void'])->name('admin.requests.payments.void');

    // Disponibilidad (JSON para el panel).
    Route::get('disponibilidad', [AvailabilityController::class, 'show'])->name('admin.availability.show');

    // Agenda semanal.
    Route::get('agenda', [AgendaController::class, 'index'])->name('admin.agenda');

    // Pacientes. La búsqueda se registra antes de {patient} para evitar
    // que "buscar" se interprete como un identificador.
    Route::get('pacientes/buscar', [PatientController::class, 'search'])->name('admin.patients.search');
    Route::get('pacientes', [PatientController::class, 'index'])->name('admin.patients.index');
    Route::get('pacientes/{patient}', [PatientController::class, 'show'])->name('admin.patients.show');
    Route::patch('pacientes/{patient}', [PatientController::class, 'update'])->name('admin.patients.update');
    Route::post('pacientes/{patient}/notas', [PatientNoteController::class, 'store'])->name('admin.patients.notes.store');
    Route::patch('pacientes/{patient}/notas/{note}', [PatientNoteController::class, 'update'])->name('admin.patients.notes.update');

    // Horarios de atención y bloqueos.
    Route::get('horarios', [WorkScheduleController::class, 'index'])->name('admin.schedule.index');
    Route::put('horarios', [WorkScheduleController::class, 'update'])->name('admin.schedule.update');
    Route::post('bloqueos', [AvailabilityBlockController::class, 'store'])->name('admin.blocks.store');
    Route::delete('bloqueos/{block}', [AvailabilityBlockController::class, 'destroy'])->name('admin.blocks.destroy');
});
