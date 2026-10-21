<?php

namespace App\Http\Requests;

use App\Models\AppointmentRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
     * Normaliza los datos antes de validarlos: los espacios sobrantes no se
     * guardan y un texto con solo espacios no pasa la longitud mínima.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'patient_name' => is_string($this->patient_name) ? trim($this->patient_name) : $this->patient_name,
            'custom_service' => is_string($this->custom_service) ? trim($this->custom_service) : $this->custom_service,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_name' => ['required', 'string', 'min:2', 'max:120'],
            'service' => [
                'required',
                'string',
                Rule::in([...AppointmentRequest::SERVICES, AppointmentRequest::OTHER_SERVICE]),
            ],

            /*
                Solo se valida cuando el paciente elige "Otro servicio".
                En cualquier otro caso el campo se excluye de la validación
                (así un valor vacío enviado por el navegador no genera error).
            */
            'custom_service' => [
                'exclude_unless:service,'.AppointmentRequest::OTHER_SERVICE,
                'required',
                'string',
                'min:3',
                'max:'.AppointmentRequest::CUSTOM_SERVICE_MAX_LENGTH,
            ],
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
            'custom_service.required' => 'Por favor escribe el servicio que necesitas.',
            'custom_service.min' => 'Describe el servicio que necesitas con al menos 3 caracteres.',
            'custom_service.max' => 'La descripción del servicio no puede superar los 100 caracteres.',
        ];
    }
}
