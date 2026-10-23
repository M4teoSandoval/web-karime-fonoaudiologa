<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registro básico de pacientes. No se impone una restricción única sobre
     * el nombre ni el teléfono: puede haber familiares que compartan número o
     * personas con nombres iguales. Las coincidencias se revisan manualmente
     * en el panel antes de crear o reutilizar un registro.
     */
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();

            $table->string('name', 120)->index();

            // Teléfono tal como lo escribe Karime (para mostrar).
            $table->string('phone', 30)->nullable();

            // Solo dígitos, para búsquedas y detección de coincidencias.
            $table->string('phone_normalized', 30)->nullable()->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
