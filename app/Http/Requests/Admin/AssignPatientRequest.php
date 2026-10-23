<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AssignPatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'patient_name' => is_string($this->patient_name) ? trim($this->patient_name) : $this->patient_name,
            'patient_phone' => is_string($this->patient_phone) ? trim($this->patient_phone) : $this->patient_phone,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['nullable', 'required_without:patient_name', 'integer', 'exists:patients,id'],
            'patient_name' => ['nullable', 'required_without:patient_id', 'string', 'min:2', 'max:120'],
            'patient_phone' => ['nullable', 'required_without:patient_id', 'string', 'min:7', 'max:30'],
            'allow_duplicate_phone' => ['nullable', 'boolean'],
        ];
    }
}
