<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Notas de seguimiento (privadas) y sus revisiones.
     *
     * Las notas nuevas se agregan; al editar una nota se guarda la versión
     * anterior en patient_note_revisions para no perder el historial.
     */
    public function up(): void
    {
        Schema::create('patient_notes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->cascadeOnDelete();

            $table->foreignId('appointment_id')
                ->nullable()
                ->constrained('appointment_requests')
                ->nullOnDelete();

            $table->text('body');
            $table->date('noted_at')->index();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['patient_id', 'noted_at']);
        });

        Schema::create('patient_note_revisions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_note_id')
                ->constrained('patient_notes')
                ->cascadeOnDelete();

            $table->text('body');

            $table->foreignId('edited_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_note_revisions');
        Schema::dropIfExists('patient_notes');
    }
};
