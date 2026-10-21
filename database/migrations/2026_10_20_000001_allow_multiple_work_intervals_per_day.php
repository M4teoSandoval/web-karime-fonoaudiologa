<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permite guardar varios intervalos de trabajo por día de la semana
     * (por ejemplo: 08:00–12:00 y 14:00–18:00), dejando las pausas
     * (como el almuerzo) fuera de la disponibilidad.
     *
     * Antes existía un índice único por día_of_week que limitaba el
     * sistema a UNA jornada continua por día. Se reemplaza por un índice
     * simple: los registros existentes se conservan intactos y siguen
     * comportándose como una única jornada.
     */
    public function up(): void
    {
        Schema::table('work_schedules', function (Blueprint $table) {
            $table->dropUnique('work_schedules_day_of_week_unique');
        });

        Schema::table('work_schedules', function (Blueprint $table) {
            $table->index(['day_of_week', 'start_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_schedules', function (Blueprint $table) {
            $table->dropIndex(['day_of_week', 'start_time']);
        });

        Schema::table('work_schedules', function (Blueprint $table) {
            $table->unique('day_of_week');
        });
    }
};
