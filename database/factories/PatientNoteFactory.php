<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\PatientNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientNote>
 */
class PatientNoteFactory extends Factory
{
    protected $model = PatientNote::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'appointment_id' => null,
            'body' => fake()->sentence(12),
            'noted_at' => now()->toDateString(),
            'created_by' => null,
        ];
    }
}
