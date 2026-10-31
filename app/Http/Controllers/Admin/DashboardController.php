<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\ServicePackage;
use App\Models\WorkSchedule;
use App\Support\AppointmentPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Resumen del panel: indicadores operativos y financieros del mes elegido.
     *
     * Los ingresos se calculan por la fecha efectiva del pago (paid_on), no
     * por la fecha de la cita. Así un abono recibido hoy cuenta en el mes en
     * que realmente entró el dinero.
     */
    public function index(Request $request): Response
    {
        $period = $this->resolvePeriod($request->query('month'));

        $monthStart = $period->copy()->startOfMonth();
        $monthEnd = $period->copy()->endOfMonth();
        $previousStart = $monthStart->copy()->subMonthNoOverflow()->startOfMonth();
        $previousEnd = $previousStart->copy()->endOfMonth();

        $incomeCents = $this->incomeBetween($monthStart, $monthEnd);
        $previousIncomeCents = $this->incomeBetween($previousStart, $previousEnd);
        $variationPercent = $previousIncomeCents > 0
            ? round((($incomeCents - $previousIncomeCents) / $previousIncomeCents) * 100, 1)
            : null;

        $counts = AppointmentRequest::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $attendedThisMonth = AppointmentRequest::query()
            ->where('status', AppointmentRequest::STATUS_ATTENDED)
            ->whereBetween('attended_at', [$monthStart, $monthEnd]);

        $attendedCount = (clone $attendedThisMonth)->count();
        $attendedPatientsCount = (clone $attendedThisMonth)
            ->whereNotNull('patient_id')
            ->distinct()
            ->count('patient_id');

        $upcoming = AppointmentRequest::query()
            ->occupying()
            ->withPaidTotal()
            ->with('package.payments')
            ->where('confirmed_start', '>=', Carbon::now())
            ->orderBy('confirmed_start')
            ->limit(5)
            ->get();

        $recent = AppointmentRequest::query()
            ->whereIn('status', [AppointmentRequest::STATUS_PENDING, AppointmentRequest::STATUS_SLOTS_PROPOSED])
            ->latest()
            ->limit(6)
            ->get();

        $outstandingCents = AppointmentRequest::query()
            ->chargeable()
            ->whereNotNull('service_value_cents')
            ->withPaidTotal()
            ->get()
            ->sum(fn (AppointmentRequest $appointment) => max(0, (int) $appointment->balanceCents()));

        // El saldo de los paquetes se suma una sola vez, nunca por sesión.
        $outstandingCents += ServicePackage::query()
            ->withPaidTotal()
            ->get()
            ->sum(fn (ServicePackage $package) => $package->balanceCents());

        $hasSchedules = WorkSchedule::query()->where('is_active', true)->exists();

        return Inertia::render('admin/dashboard', [
            'period' => $monthStart->format('Y-m'),
            'period_label' => AppointmentPresenter::monthLabel($monthStart),
            'previous_period' => $previousStart->format('Y-m'),
            'next_period' => $monthStart->lessThan(Carbon::now()->startOfMonth())
                ? $monthStart->copy()->addMonthNoOverflow()->format('Y-m')
                : null,
            'is_current_period' => $monthStart->isSameMonth(Carbon::now()),
            'can_go_next' => $monthStart->lessThan(Carbon::now()->startOfMonth()),
            'finance' => [
                'income_cents' => $incomeCents,
                'previous_income_cents' => $previousIncomeCents,
                'variation_percent' => $variationPercent,
                'attended_count' => $attendedCount,
                'attended_patients_count' => $attendedPatientsCount,
                'new_patients_count' => Patient::query()->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
                'outstanding_cents' => (int) $outstandingCents,
            ],
            'counts' => [
                'pending' => (int) ($counts[AppointmentRequest::STATUS_PENDING] ?? 0),
                'slots_proposed' => (int) ($counts[AppointmentRequest::STATUS_SLOTS_PROPOSED] ?? 0),
                'confirmed' => (int) ($counts[AppointmentRequest::STATUS_CONFIRMED] ?? 0),
                'attended' => (int) ($counts[AppointmentRequest::STATUS_ATTENDED] ?? 0),
                'no_show' => (int) ($counts[AppointmentRequest::STATUS_NO_SHOW] ?? 0),
                'cancelled' => (int) ($counts[AppointmentRequest::STATUS_CANCELLED] ?? 0),
            ],
            'upcoming' => $upcoming->map(
                fn (AppointmentRequest $appointment) => AppointmentPresenter::summary($appointment)
            ),
            'recent' => $recent->map(
                fn (AppointmentRequest $appointment) => AppointmentPresenter::summary($appointment)
            ),
            'monthly' => $this->monthlySummary($monthStart),
            'hasSchedules' => $hasSchedules,
        ]);
    }

    /**
     * Últimos seis meses (incluido el seleccionado) para el resumen mensual.
     *
     * @return list<array{period: string, label: string, income_cents: int, attended_count: int}>
     */
    private function monthlySummary(Carbon $selectedMonth): array
    {
        $start = $selectedMonth->copy()->subMonthsNoOverflow(5)->startOfMonth();
        $end = $selectedMonth->copy()->endOfMonth();

        $payments = Payment::query()
            ->active()
            ->whereBetween('paid_on', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->get(['paid_on', 'amount_cents'])
            ->groupBy(fn (Payment $payment) => $payment->paid_on?->format('Y-m'));

        $attended = AppointmentRequest::query()
            ->where('status', AppointmentRequest::STATUS_ATTENDED)
            ->whereBetween('attended_at', [$start, $end])
            ->get(['attended_at'])
            ->groupBy(fn (AppointmentRequest $appointment) => $appointment->attended_at?->format('Y-m'));

        $months = [];

        for ($i = 0; $i < 6; $i++) {
            $month = $start->copy()->addMonthsNoOverflow($i);
            $key = $month->format('Y-m');

            $months[] = [
                'period' => $key,
                'label' => ucfirst($month->locale('es')->isoFormat('MMM YYYY')),
                'income_cents' => (int) ($payments->get($key)?->sum('amount_cents') ?? 0),
                'attended_count' => (int) ($attended->get($key)?->count() ?? 0),
            ];
        }

        return $months;
    }

    private function incomeBetween(Carbon $start, Carbon $end): int
    {
        return (int) Payment::query()
            ->active()
            ->whereBetween('paid_on', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
            ->sum('amount_cents');
    }

    private function resolvePeriod(mixed $value): Carbon
    {
        if (is_string($value) && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value) === 1) {
            return Carbon::createFromFormat('Y-m', $value)->startOfMonth();
        }

        return Carbon::now()->startOfMonth();
    }
}
