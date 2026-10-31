<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Asocia un pago al paquete al que pertenece.
     *
     * El pago conserva su "appointment_id" (la sesión desde la que se
     * registró) para no alterar el modelo actual ni los pagos históricos,
     * pero su saldo y su estado financiero se calculan contra el paquete.
     * Así un abono de un paquete de 8 sesiones se registra una sola vez y no
     * se duplica como ingreso.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('package_id')
                ->nullable()
                ->after('appointment_id')
                ->index()
                ->constrained('service_packages')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['package_id']);
            $table->dropColumn('package_id');
        });
    }
};
