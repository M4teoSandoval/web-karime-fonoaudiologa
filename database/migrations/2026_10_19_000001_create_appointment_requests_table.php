<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appointment_requests', function (Blueprint $table) {
            $table->id();

            // Datos del paciente (registro anónimo, sin cuenta).
            $table->string('patient_name', 120);
            $table->string('service', 100);

            // pending | slots_proposed | confirmed | cancelled
            $table->string('status', 30)->default('pending')->index();

            // Duración en minutos definida manualmente por Karime al gestionar.
            $table->unsignedSmallInteger('duration_minutes')->default(60);

            // Horarios propuestos al paciente: [{ start: "Y-m-d H:i:s", end: "Y-m-d H:i:s" }]
            $table->json('proposed_slots')->nullable();

            // Horario final acordado y confirmado (reserva definitiva del espacio).
            $table->dateTime('confirmed_start')->nullable()->index();
            $table->dateTime('confirmed_end')->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_requests');
    }
};
