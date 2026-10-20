<?php

namespace Database\Factories;

use App\Models\AppointmentRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppointmentRequest>
 */
class AppointmentRequestFactory extends Factory
{
    protected $model = AppointmentRequest::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_name' => fake()->name(),
            'service' => fake()->randomElement(AppointmentRequest::SERVICES),
            'status' => AppointmentRequest::STATUS_PENDING,
            'duration_minutes' => 60,
            'proposed_slots' => null,
            'confirmed_start' => null,
            'confirmed_end' => null,
            'notes' => null,
        ];
    }

    /**
     * Solicitud con una cita confirmada en la fecha indicada.
     */
    public function confirmed(string $start, int $durationMinutes = 60): static
    {
        return $this->state(fn () => [
            'status' => AppointmentRequest::STATUS_CONFIRMED,
            'duration_minutes' => $durationMinutes,
            'confirmed_start' => $start,
            'confirmed_end' => \Illuminate\Support\Carbon::parse($start)->addMinutes($durationMinutes),
        ]);
    }
}
