/**
 * Utilidades de dinero para el panel.
 *
 * El backend trabaja siempre en centavos enteros. El formato se hace con
 * Intl para mostrar pesos colombianos sin decimales, que es como se manejan
 * habitualmente en consulta.
 */

const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
});

/** Formatea centavos como "$ 100.000". */
export function formatMoney(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) {
        return '—';
    }

    return currencyFormatter.format(Math.round(cents / 100));
}

/** Centavos a texto editable para inputs de dinero ("100000" o "100000.50"). */
export function centsToInput(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) {
        return '';
    }

    const pesos = Math.trunc(cents / 100);
    const remainder = Math.abs(cents % 100);

    return remainder === 0 ? String(pesos) : (cents / 100).toFixed(2);
}

/**
 * Convierte lo escrito por la persona a centavos para mostrar una vista
 * previa o el saldo estimado. No sustituye la validación del servidor.
 */
export function inputToCents(value: string): number | null {
    const raw = value.trim();

    if (raw === '') {
        return null;
    }

    const cleaned = raw.replace(/[^\d.,]/g, '');

    if (cleaned === '') {
        return null;
    }

    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    const lastSeparator = Math.max(lastDot, lastComma);
    const hasBoth = lastDot !== -1 && lastComma !== -1;

    let integerPart = cleaned;
    let fractionPart = '';

    if (lastSeparator >= 0) {
        const digitsAfter = cleaned.length - lastSeparator - 1;
        const isDecimal = hasBoth || (digitsAfter > 0 && digitsAfter <= 2);

        if (isDecimal) {
            integerPart = cleaned.slice(0, lastSeparator);
            fractionPart = cleaned.slice(lastSeparator + 1);
        }
    }

    const integers = integerPart.replace(/\D/g, '') || '0';
    const fraction = fractionPart.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);

    const cents = Number(integers) * 100 + Number(fraction);

    return Number.isFinite(cents) ? cents : null;
}
