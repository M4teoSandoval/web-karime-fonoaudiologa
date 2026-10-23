<?php

namespace App\Http\Requests\Admin;

use App\Models\Payment;
use App\Rules\MoneyAmount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkAppointmentAttendedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'payment_amount' => is_string($this->payment_amount) ? trim($this->payment_amount) : $this->payment_amount,
            'payment_notes' => is_string($this->payment_notes) ? trim($this->payment_notes) : $this->payment_notes,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'register_payment' => ['required', 'boolean'],

            'payment_amount' => [
                'nullable',
                'required_if:register_payment,true',
                new MoneyAmount,
            ],
            'payment_paid_on' => ['nullable', 'required_if:register_payment,true', 'date', 'before_or_equal:today'],
            'payment_method' => ['nullable', Rule::in(Payment::METHODS)],
            'payment_notes' => ['nullable', 'string', 'max:1000'],
            'payment_idempotency_key' => ['nullable', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'payment_amount.required_if' => 'Escribe el importe recibido o elige dejar el pago pendiente.',
            'payment_paid_on.required_if' => 'Indica la fecha efectiva del pago.',
            'payment_paid_on.before_or_equal' => 'La fecha del pago no puede estar en el futuro.',
        ];
    }
}
