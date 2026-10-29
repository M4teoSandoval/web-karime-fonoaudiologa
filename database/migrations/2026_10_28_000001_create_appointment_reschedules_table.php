<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Historial de reprogramaciones de citas.
     *
     * Es una tabla nueva: no altera ni elimina datos existentes. Cada fila
     * conserva el horario anterior y el nuevo, quién realizó el cambio y el
     * motivo opcional, de modo que una cita puede reprogramarse varias veces
     * sin perder trazabilidad.
     */
    public function up(): void
    {
        Schema::create('appointment_reschedules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('appointment_id')
                ->constrained('appointment_requests')
                ->cascadeOnDelete();

            $table->dateTime('previous_start');
            $table->dateTime('previous_end');
            $table->dateTime('new_start');
            $table->dateTime('new_end');

            $table->string('reason', 500)->nullable();

            // Administradora que hizo la reprogramación. Se conserva el
            // historial aunque el usuario se elimine en el futuro.
            $table->foreignId('rescheduled_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['appointment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_reschedules');
    }
};
