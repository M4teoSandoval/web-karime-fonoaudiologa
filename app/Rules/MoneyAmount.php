<?php

namespace App\Rules;

use App\Support\Money;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class MoneyAmount implements ValidationRule
{
    public function __construct(
        private readonly int $minCents = 1,
        private readonly ?int $maxCents = Money::MAX_CENTS,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) && ! is_int($value) && ! is_float($value)) {
            $fail('El valor debe ser un monto válido.');

            return;
        }

        $cents = Money::toCents($value);

        if ($cents === null) {
            $fail('Escribe un monto válido, por ejemplo 100000.');

            return;
        }

        if ($cents < $this->minCents) {
            $fail('El monto debe ser mayor que cero.');

            return;
        }

        if ($this->maxCents !== null && $cents > $this->maxCents) {
            $fail('El monto es demasiado alto.');
        }
    }
}
