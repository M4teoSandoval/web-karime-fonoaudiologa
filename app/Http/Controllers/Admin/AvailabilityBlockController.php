<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityBlock;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AvailabilityBlockController extends Controller
{
    /**
     * Crea un bloqueo de disponibilidad: día completo (sin hora) o
     * una franja horaria específica.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'required_with:start_time', 'after:start_time'],
            'reason' => ['nullable', 'string', 'max:160'],
        ]);

        $isPartial = ! empty($validated['start_time']) && ! empty($validated['end_time']);

        AvailabilityBlock::create([
            'date' => $validated['date'],
            'start_time' => $isPartial ? $validated['start_time'] : null,
            'end_time' => $isPartial ? $validated['end_time'] : null,
            'reason' => $validated['reason'] !== null && $validated['reason'] !== '' ? trim($validated['reason']) : null,
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => $isPartial ? 'Franja horaria bloqueada.' : 'Día completo bloqueado.',
        ]);
    }

    /**
     * Elimina un bloqueo previamente creado.
     */
    public function destroy(AvailabilityBlock $block): RedirectResponse
    {
        $block->delete();

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Bloqueo eliminado. El horario vuelve a estar disponible.',
        ]);
    }
}
