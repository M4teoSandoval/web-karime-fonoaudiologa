<?php

namespace App\Support;

/**
 * Conversión precisa entre pesos colombianos y centavos.
 *
 * Los formularios envían el valor como texto para no perder precisión al
 * atravesar JSON/JavaScript. Aquí se aceptan formatos habituales como
 * "100000", "100.000", "100.000,50" o "$ 100.000".
 */
final class Money
{
    public const MAX_CENTS = 9_999_999_999_900; // ~100 mil millones de pesos

    public static function toCents(string|int|float|null $value): ?int
    {
        if ($value === null) {
            return null;
        }

        if (is_int($value) || is_float($value)) {
            if (! is_finite((float) $value)) {
                return null;
            }

            return (int) round((float) $value * 100);
        }

        $raw = trim($value);

        if ($raw === '') {
            return null;
        }

        // Conserva solo dígitos y separadores; elimina símbolos de moneda.
        $raw = preg_replace('/[^\d.,]/', '', $raw) ?? '';

        if ($raw === '') {
            return null;
        }

        $lastDot = strrpos($raw, '.');
        $lastComma = strrpos($raw, ',');
        $lastSeparator = max($lastDot === false ? -1 : $lastDot, $lastComma === false ? -1 : $lastComma);

        $integerPart = $raw;
        $fractionPart = '';

        if ($lastSeparator >= 0) {
            $digitsAfter = strlen($raw) - $lastSeparator - 1;
            $hasBothSeparators = $lastDot !== false && $lastComma !== false;

            $separatorIsDecimal = $hasBothSeparators
                ? true
                : ($digitsAfter > 0 && $digitsAfter <= 2);

            if ($separatorIsDecimal) {
                $integerPart = substr($raw, 0, $lastSeparator);
                $fractionPart = substr($raw, $lastSeparator + 1);
            }
        }

        $integerPart = preg_replace('/\D/', '', $integerPart) ?? '';
        $fractionPart = preg_replace('/\D/', '', $fractionPart) ?? '';

        if ($integerPart === '' && $fractionPart === '') {
            return null;
        }

        $integerPart = $integerPart === '' ? '0' : ltrim($integerPart, '0');
        $integerPart = $integerPart === '' ? '0' : $integerPart;

        if (strlen($integerPart) > 12) {
            return null;
        }

        $fractionPart = substr(str_pad($fractionPart, 2, '0'), 0, 2);

        $cents = ((int) $integerPart) * 100 + (int) $fractionPart;

        return $cents >= 0 ? $cents : null;
    }

    /**
     * Representación para inputs de edición: "100000" o "100000.50".
     */
    public static function toInput(?int $cents): string
    {
        if ($cents === null) {
            return '';
        }

        $pesos = intdiv($cents, 100);
        $remainder = $cents % 100;

        return $remainder === 0
            ? (string) $pesos
            : number_format($cents / 100, 2, '.', '');
    }
}
