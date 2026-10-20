<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    /**
     * Devuelve los espacios libres para una fecha y duración dadas.
     * Usado por el panel para proponer y confirmar horarios.
     */
    public function show(Request $request, AvailabilityService $availability): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today'],
            'duration' => ['required', 'integer', 'min:5', 'max:1440'],
            'exclude' => ['nullable', 'integer'],
        ]);

        $slots = $availability->availableSlots(
            $validated['date'],
            (int) $validated['duration'],
            isset($validated['exclude']) ? (int) $validated['exclude'] : null,
        );

        return response()->json(['slots' => $slots]);
    }
}
