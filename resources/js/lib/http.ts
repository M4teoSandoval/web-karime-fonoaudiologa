/**
 * Utilidades mínimas para llamadas JSON que no pasan por Inertia.
 *
 * El panel usa `fetch` para consultas de solo lectura (disponibilidad). Para
 * envíos POST necesitamos el token CSRF que Laravel guarda en la cookie
 * `XSRF-TOKEN`, igual que hace axios en el resto de la aplicación.
 */

function readCookie(name: string): string | null {
    const prefix = `${name}=`;
    const match = document.cookie.split('; ').find((item) => item.startsWith(prefix));

    return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
    const token = readCookie('XSRF-TOKEN');
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
        const firstError = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined;

        throw new Error(firstError ?? payload?.message ?? 'La solicitud no se pudo completar.');
    }

    return (await response.json()) as T;
}
