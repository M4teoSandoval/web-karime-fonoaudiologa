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
        Schema::create('availability_blocks', function (Blueprint $table) {
            $table->id();

            $table->date('date')->index();

            // Sin hora = día completo. Con hora = franja específica.
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();

            $table->string('reason', 160)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('availability_blocks');
    }
};
