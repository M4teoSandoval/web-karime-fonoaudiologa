<?php

namespace App\Http\Requests\Admin;

use App\Models\AppointmentRequest;
use App\Rules\MoneyAmount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualAppointmentRequest extends FormRequest
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
            'custom_service' => is_string($this->custom_service) ? trim($this->custom_service) : $this->custom_service,
            'notes' => is_string($this->notes) ? trim($this->notes) : $this->notes,
            'service_value' => is_string($this->service_value) ? trim($this->service_value) : $this->service_value,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'patient_mode' => ['required', Rule::in(['existing', 'new'])],

            'patient_id' => [
                'nullable',
                'required_if:patient_mode,existing',
                'integer',
                Rule::exists('patients', 'id'),
            ],

            'patient_name' => ['nullable', 'required_if:patient_mode,new', 'string', 'min:2', 'max:120'],
            'patient_phone' => ['nullable', 'required_if:patient_mode,new', 'string', 'min:7', 'max:30'],
            'patient_allow_duplicate_phone' => ['nullable', 'boolean'],

            'service' => [
                'required',
                'string',
                Rule::in([...AppointmentRequest::SERVICES, AppointmentRequest::OTHER_SERVICE]),
            ],
            'custom_service' => [
                'exclude_unless:service,'.AppointmentRequest::OTHER_SERVICE,
                'required',
                'string',
                'min:3',
                'max:'.AppointmentRequest::CUSTOM_SERVICE_MAX_LENGTH,
            ],

            'date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],

            'service_value' => ['required', new MoneyAmount],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'patient_id.required_if' => 'Selecciona el paciente existente.',
            'patient_name.required_if' => 'Escribe el nombre del paciente.',
            'patient_phone.required_if' => 'Escribe el teléfono de contacto.',
            'patient_phone.min' => 'El teléfono debe tener al menos 7 dígitos.',
            'date.after_or_equal' => 'La fecha de la cita no puede estar en el pasado.',
            'service.in' => 'El servicio seleccionado no es válido.',
            'custom_service.required' => 'Escribe el servicio que se va a prestar.',
        ];
    }
}
