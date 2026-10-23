<?php

namespace App\Http\Requests\Admin;

use App\Models\Payment;
use App\Rules\MoneyAmount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'amount' => is_string($this->amount) ? trim($this->amount) : $this->amount,
            'notes' => is_string($this->notes) ? trim($this->notes) : $this->notes,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', new MoneyAmount],
            'paid_on' => ['required', 'date', 'before_or_equal:today'],
            'method' => ['nullable', Rule::in(Payment::METHODS)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'paid_on.before_or_equal' => 'La fecha del pago no puede estar en el futuro.',
            'method.in' => 'El método de pago seleccionado no es válido.',
        ];
    }
}
