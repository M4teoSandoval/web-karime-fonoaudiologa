<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Paquetes de sesiones.
     *
     * Un paquete agrupa varias citas del mismo paciente y servicio. El valor
     * total y las observaciones generales viven aquí, no en cada sesión, para
     * que un pago del paquete se contabilice una sola vez. Las citas
     * individuales anteriores no se modifican.
     */
    public function up(): void
    {
        Schema::create('service_packages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->nullable()
                ->index()
                ->constrained('patients')
                ->nullOnDelete();

            $table->string('service', 100);

            // Cantidad total de sesiones acordadas con el paciente.
            $table->unsignedSmallInteger('sessions_count');

            // Duración de cada sesión, en minutos.
            $table->unsignedSmallInteger('duration_minutes')->default(60);

            // Valor total del paquete, en centavos.
            $table->unsignedBigInteger('total_value_cents');

            $table->text('notes')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_packages');
    }
};
