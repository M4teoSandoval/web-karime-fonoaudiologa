<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ampliación incremental de la tabla de citas existente.
     *
     * Todas las columnas nuevas son nullable o tienen un valor por defecto,
     * por lo que las solicitudes históricas siguen funcionando sin cambios.
     * No se renombra ni se elimina ninguna columna actual.
     */
    public function up(): void
    {
        Schema::table('appointment_requests', function (Blueprint $table) {
            // Paciente vinculado (nullable: las solicitudes públicas antiguas
            // se vinculan manualmente desde el panel).
            $table->foreignId('patient_id')
                ->nullable()
                ->index()
                ->constrained('patients')
                ->nullOnDelete();

            // Teléfono de contacto de esta cita (copia del paciente o dato
            // puntual si la solicitud pública aún no tiene paciente).
            $table->string('patient_phone', 30)->nullable()->after('patient_name');

            // public | manual
            $table->string('source', 20)->default('public')->after('status')->index();

            // Valor acordado del servicio, en centavos. Nullable porque las
            // solicitudes históricas no tienen valor registrado.
            $table->unsignedBigInteger('service_value_cents')->nullable()->after('duration_minutes');

            // Trazabilidad de los nuevos estados de atención.
            $table->timestamp('attended_at')->nullable()->after('notes');
            $table->timestamp('cancelled_at')->nullable()->after('attended_at');
            $table->timestamp('no_show_at')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointment_requests', function (Blueprint $table) {
            $table->dropForeign(['patient_id']);
            $table->dropColumn([
                'patient_id',
                'patient_phone',
                'source',
                'service_value_cents',
                'attended_at',
                'cancelled_at',
                'no_show_at',
            ]);
        });
    }
};
