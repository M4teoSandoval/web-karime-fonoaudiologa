<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePaymentRequest;
use App\Http\Requests\Admin\VoidPaymentRequest;
use App\Models\AppointmentRequest;
use App\Models\Payment;
use App\Models\ServicePackage;
use App\Services\PaymentService;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /**
     * Registra un abono o pago completo. El servicio valida el saldo dentro
     * de una transacción y respeta la clave de idempotencia del formulario.
     */
    public function store(StorePaymentRequest $request, AppointmentRequest $appointment): RedirectResponse
    {
        $validated = $request->validated();
        $amountCents = Money::toCents($validated['amount']);

        $this->payments->record($appointment, [
            'amount_cents' => (int) $amountCents,
            'paid_on' => $validated['paid_on'],
            'method' => $validated['method'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'idempotency_key' => $validated['idempotency_key'] ?? null,
        ], $request->user());

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Pago registrado correctamente.',
        ]);
    }

    /**
     * Registra un abono a cuenta de un paquete. El pago queda asociado al
     * paquete (una sola vez) y no se repite por cada sesión.
     */
    public function storeForPackage(StorePaymentRequest $request, ServicePackage $package): RedirectResponse
    {
        $validated = $request->validated();
        $amountCents = Money::toCents($validated['amount']);

        $this->payments->recordForPackage($package, [
            'amount_cents' => (int) $amountCents,
            'paid_on' => $validated['paid_on'],
            'method' => $validated['method'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'idempotency_key' => $validated['idempotency_key'] ?? null,
        ], $request->user());

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Pago del paquete registrado correctamente.',
        ]);
    }

    /**
     * Anula un pago sin eliminarlo. El historial y el motivo se conservan.
     */
    public function void(VoidPaymentRequest $request, AppointmentRequest $appointment, Payment $payment): RedirectResponse
    {
        abort_unless((int) $payment->appointment_id === (int) $appointment->id, 404);

        $this->payments->void($payment, $request->validated()['reason'], $request->user());

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Pago anulado. El movimiento queda registrado en el historial.',
        ]);
    }

    /**
     * Anula un pago concreto del paquete. Los pagos de paquete se guardan una
     * sola vez, por lo que anularlos no altera el historial de las sesiones.
     */
    public function voidForPackage(VoidPaymentRequest $request, ServicePackage $package, Payment $payment): RedirectResponse
    {
        abort_unless((int) $payment->package_id === (int) $package->id, 404);

        $this->payments->void($payment, $request->validated()['reason'], $request->user());

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Pago del paquete anulado. El movimiento queda registrado en el historial.',
        ]);
    }
}
