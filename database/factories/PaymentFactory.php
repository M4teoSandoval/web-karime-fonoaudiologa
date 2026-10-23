<?php

namespace Database\Factories;

use App\Models\AppointmentRequest;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'appointment_id' => AppointmentRequest::factory(),
            'amount_cents' => fake()->numberBetween(50_000, 2_000_000),
            'paid_on' => now()->toDateString(),
            'method' => fake()->randomElement(Payment::METHODS),
            'notes' => null,
            'idempotency_key' => null,
        ];
    }
}
