/**
 * Número de WhatsApp profesional de Karime.
 * Configurable con VITE_WHATSAPP_NUMBER (debe coincidir con WHATSAPP_NUMBER del backend).
 */
const configuredNumber: string | undefined = import.meta.env.VITE_WHATSAPP_NUMBER;

export const WHATSAPP_NUMBER: string = configuredNumber && configuredNumber.length > 0 ? configuredNumber : '573150596654';

/** Construye un enlace wa.me con el mensaje precargado. */
export function buildWhatsAppUrl(message: string): string {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Enlace general de contacto usado en los CTAs del sitio. */
export const defaultWhatsAppUrl: string = buildWhatsAppUrl(
    'Quisiera agendar una cita. Me gustaría conocer la disponibilidad y recibir más información.',
);
