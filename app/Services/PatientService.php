<?php

namespace App\Services;

use App\Models\Patient;
use Illuminate\Validation\ValidationException;

class PatientService
{
    /**
     * Crea un paciente normalizando el teléfono. Por defecto se impide
     * duplicar un teléfono ya registrado; Karime puede confirmar el caso
     * (por ejemplo, familiares que comparten número) explícitamente.
     */
    public function create(string $name, ?string $phone, bool $allowDuplicatePhone = false): Patient
    {
        $name = trim($name);
        $phone = $phone !== null ? trim($phone) : null;
        $normalized = Patient::normalizePhone($phone);

        if (! $allowDuplicatePhone && $normalized !== null) {
            $existing = Patient::query()
                ->where('phone_normalized', $normalized)
                ->first();

            if ($existing !== null) {
                throw ValidationException::withMessages([
                    'patient_phone' => "Ya existe un paciente con este teléfono: {$existing->name}. Selecciónalo para evitar un duplicado. Si comparten el número, confirma que deseas crear un registro aparte.",
                ]);
            }
        }

        return Patient::create([
            'name' => $name,
            'phone' => $phone,
            'phone_normalized' => $normalized,
        ]);
    }
}
