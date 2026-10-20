<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppointmentRequestRequest;
use App\Models\AppointmentRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class AppointmentRequestController extends Controller
{
    /**
     * Registra una nueva solicitud de cita (pendiente) y devuelve el enlace
     * de WhatsApp con el mensaje precargado. Solo se redirige a WhatsApp si
     * el registro en base de datos fue exitoso.
     */
    public function store(StoreAppointmentRequestRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        try {
            /** @var AppointmentRequest $appointment */
            $appointment = DB::transaction(function () use ($validated) {
                return AppointmentRequest::create([
                    'patient_name' => trim($validated['patient_name']),
                    'service' => $validated['service'],
                    'status' => AppointmentRequest::STATUS_PENDING,
                ]);
            });
        } catch (Throwable $exception) {
            report($exception);

            return back()
                ->withErrors(['patient_name' => 'No fue posible registrar tu solicitud en este momento. Por favor intenta de nuevo o escríbeme directamente por WhatsApp.'])
                ->withInput();
        }

        $message = sprintf(
            'Hola, soy %s y quiero agendar una cita para el servicio de %s. ¿Qué disponibilidad tienes? Muchas gracias.',
            $appointment->patient_name,
            $appointment->service,
        );

        $whatsappUrl = sprintf(
            'https://wa.me/%s?text=%s',
            config('whatsapp.number'),
            rawurlencode($message),
        );

        return back()->with('flash', [
            'type' => 'success',
            'message' => '¡Gracias! Tu solicitud se registró correctamente. Ahora puedes indicar tu disponibilidad directamente por WhatsApp.',
            'whatsapp_url' => $whatsappUrl,
        ]);
    }
}
