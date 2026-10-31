<?php

namespace App\Http\Requests\Admin;

use App\Models\AppointmentRequest;
use App\Models\Payment;
use App\Rules\MoneyAmount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentPackageRequest extends FormRequest
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
            'total_value' => is_string($this->total_value) ? trim($this->total_value) : $this->total_value,
            'initial_payment' => is_string($this->initial_payment) ? trim($this->initial_payment) : $this->initial_payment,
            'initial_payment_notes' => is_string($this->initial_payment_notes)
                ? trim($this->initial_payment_notes)
                : $this->initial_payment_notes,
            // Las claves se normalizan para que los errores por sesión
            // coincidan siempre con la fila que Karime ve en pantalla.
            'sessions' => is_array($this->sessions) ? array_values($this->sessions) : $this->sessions,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $count = max(2, (int) $this->input('sessions_count'));

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

            'sessions_count' => ['required', 'integer', 'min:2', 'max:52'],
            'total_value' => ['required', new MoneyAmount],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'notes' => ['nullable', 'string', 'max:2000'],

            'sessions' => ['required', 'array', 'size:'.$count],
            'sessions.*.date' => ['required', 'date', 'after_or_equal:today'],
            'sessions.*.start_time' => ['required', 'date_format:H:i'],

            'initial_payment' => ['nullable', new MoneyAmount],
            'initial_payment_on' => ['nullable', 'required_with:initial_payment', 'date', 'before_or_equal:today'],
            'initial_payment_method' => ['nullable', Rule::in(Payment::METHODS)],
            'initial_payment_notes' => ['nullable', 'string', 'max:500'],
            'initial_payment_idempotency_key' => ['nullable', 'uuid'],
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
            'service.in' => 'El servicio seleccionado no es válido.',
            'custom_service.required' => 'Escribe el servicio que se va a prestar.',
            'sessions_count.min' => 'Un paquete debe tener al menos 2 sesiones.',
            'sessions.size' => 'La cantidad de horarios debe coincidir con el número de sesiones del paquete.',
            'sessions.*.date.after_or_equal' => 'Cada sesión debe tener una fecha de hoy en adelante.',
            'sessions.*.date.required' => 'Selecciona la fecha de cada sesión.',
            'sessions.*.start_time.required' => 'Selecciona la hora de cada sesión.',
            'sessions.*.start_time.date_format' => 'La hora de cada sesión debe tener el formato HH:MM.',
            'initial_payment_on.required_with' => 'Indica la fecha efectiva del abono inicial.',
            'initial_payment_on.before_or_equal' => 'La fecha del abono no puede estar en el futuro.',
            'initial_payment_method.in' => 'El método de pago seleccionado no es válido.',
        ];
    }
}
