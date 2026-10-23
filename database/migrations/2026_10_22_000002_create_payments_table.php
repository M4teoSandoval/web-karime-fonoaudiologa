<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pagos y abonos por cita.
     *
     * Los importes se guardan en centavos (enteros) para evitar errores de
     * punto flotante. Un pago nunca se elimina: se anula con voided_at y un
     * motivo, conservando la trazabilidad completa.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('appointment_id')
                ->constrained('appointment_requests')
                ->restrictOnDelete();

            $table->unsignedBigInteger('amount_cents');

            // Fecha efectiva del pago (la que cuenta para los ingresos).
            $table->date('paid_on')->index();

            // cash | transfer | card | other (opcional).
            $table->string('method', 20)->nullable();

            $table->text('notes')->nullable();

            /*
                Clave de idempotencia enviada por el formulario. Evita que un
                doble clic, un reenvío o una recarga registren el mismo pago
                dos veces. Es nullable para pagos históricos o importados.
            */
            $table->uuid('idempotency_key')->nullable()->unique();

            $table->foreignId('recorded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('voided_at')->nullable()->index();
            $table->string('void_reason', 255)->nullable();
            $table->foreignId('voided_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['appointment_id', 'voided_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
