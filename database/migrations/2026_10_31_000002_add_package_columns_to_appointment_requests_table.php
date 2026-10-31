<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Vincula las citas con su paquete. Ambas columnas son nullable, por lo
     * que todas las citas existentes (individuales) siguen funcionando sin
     * cambios. El número de sesión conserva el orden acordado aunque luego se
     * reprograme la fecha de una sesión.
     */
    public function up(): void
    {
        Schema::table('appointment_requests', function (Blueprint $table) {
            $table->foreignId('package_id')
                ->nullable()
                ->after('patient_id')
                ->index()
                ->constrained('service_packages')
                ->nullOnDelete();

            $table->unsignedSmallInteger('package_session_number')
                ->nullable()
                ->after('package_id');

            $table->unique(['package_id', 'package_session_number']);
        });
    }

    public function down(): void
    {
        Schema::table('appointment_requests', function (Blueprint $table) {
            $table->dropUnique(['package_id', 'package_session_number']);
            $table->dropForeign(['package_id']);
            $table->dropColumn(['package_id', 'package_session_number']);
        });
    }
};
