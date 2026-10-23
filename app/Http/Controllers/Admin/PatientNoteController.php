<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePatientNoteRequest;
use App\Http\Requests\Admin\UpdatePatientNoteRequest;
use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\PatientNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientNoteController extends Controller
{
    /**
     * Agrega una nota nueva. Nunca reemplaza notas anteriores.
     */
    public function store(StorePatientNoteRequest $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validated();

        if (! empty($validated['appointment_id'])) {
            $belongsToPatient = AppointmentRequest::query()
                ->whereKey((int) $validated['appointment_id'])
                ->where('patient_id', $patient->id)
                ->exists();

            if (! $belongsToPatient) {
                throw ValidationException::withMessages([
                    'appointment_id' => 'La cita seleccionada no pertenece a este paciente.',
                ]);
            }
        }

        $patient->notes()->create([
            'appointment_id' => $validated['appointment_id'] ?? null,
            'body' => $validated['body'],
            'noted_at' => $validated['noted_at'],
            'created_by' => $request->user()?->id,
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Nota de seguimiento agregada.',
        ]);
    }

    /**
     * Edita una nota conservando la versión anterior en el historial.
     * La nota debe pertenecer al paciente indicado en la URL.
     */
    public function update(UpdatePatientNoteRequest $request, Patient $patient, PatientNote $note): RedirectResponse
    {
        abort_unless((int) $note->patient_id === (int) $patient->id, 404);

        $validated = $request->validated();

        DB::transaction(function () use ($note, $validated, $request) {
            $locked = PatientNote::query()
                ->whereKey($note->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->body === $validated['body']) {
                return;
            }

            $locked->revisions()->create([
                'body' => $locked->body,
                'edited_by' => $request->user()?->id,
            ]);

            $locked->update([
                'body' => $validated['body'],
            ]);
        });

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Nota actualizada. La versión anterior quedó en el historial.',
        ]);
    }
}
