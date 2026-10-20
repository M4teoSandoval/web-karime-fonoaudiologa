<?php

namespace App\Http\Requests;

use App\Models\AppointmentRequest;
use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Solicitud pública y anónima: cualquiera puede registrar una cita.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_name' => ['required', 'string', 'min:2', 'max:120'],
            'service' => ['required', 'string', 'in:'.implode(',', AppointmentRequest::SERVICES)],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'patient_name.required' => 'Por favor escribe tu nombre.',
            'patient_name.min' => 'El nombre debe tener al menos 2 caracteres.',
            'patient_name.max' => 'El nombre no puede superar los 120 caracteres.',
            'service.required' => 'Por favor selecciona un servicio.',
            'service.in' => 'El servicio seleccionado no es válido.',
        ];
    }
}
