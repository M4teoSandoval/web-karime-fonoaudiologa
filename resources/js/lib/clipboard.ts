/**
 * Copia texto al portapapeles del navegador.
 *
 * Usa la API asíncrona cuando está disponible (contextos seguros: HTTPS o
 * localhost) y recurre a un área de texto temporal para entornos sin soporte,
 * de modo que el botón "Copiar mensaje" siempre funcione.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) {
        return false;
    }

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);

            return true;
        } catch {
            // Se intenta el método alternativo más abajo.
        }
    }

    try {
        const textarea = document.createElement('textarea');

        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copied = document.execCommand('copy');

        document.body.removeChild(textarea);

        return copied;
    } catch {
        return false;
    }
}
