<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RescheduleAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => is_string($this->reason) ? trim($this->reason) : $this->reason,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.required' => 'Selecciona la nueva fecha de la cita.',
            'date.after_or_equal' => 'La nueva fecha no puede estar en el pasado.',
            'start_time.required' => 'Selecciona la nueva hora de inicio.',
            'start_time.date_format' => 'La hora de inicio no tiene un formato válido.',
            'duration_minutes.required' => 'Indica la duración de la cita.',
            'duration_minutes.min' => 'La duración mínima es de 5 minutos.',
            'duration_minutes.max' => 'La duración máxima es de 8 horas.',
            'reason.max' => 'El motivo no puede superar los 500 caracteres.',
        ];
    }
}
