<?php

namespace Database\Factories;

use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    protected $model = Patient::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $phone = fake()->unique()->numerify('3#########');

        return [
            'name' => fake()->name(),
            'phone' => $phone,
            'phone_normalized' => Patient::normalizePhone($phone),
        ];
    }
}
