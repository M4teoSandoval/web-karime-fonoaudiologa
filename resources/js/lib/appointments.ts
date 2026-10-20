import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { type AppointmentStatus, type ProposedSlot } from '@/types';

export const statusLabels: Record<AppointmentStatus, string> = {
    pending: 'Pendiente',
    slots_proposed: 'Horarios propuestos',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
};

export const statusBadgeClasses: Record<AppointmentStatus, string> = {
    pending: 'bg-[#f4e7e8] text-[#c98796]',
    slots_proposed: 'bg-[#7d8f7a]/15 text-[#6f826c]',
    confirmed: 'bg-[#7d8f7a] text-white',
    cancelled: 'bg-[#eadedf] text-[#706a67]',
};

/**
 * Parsea fechas "Y-m-d H:i:s" del servidor como hora local,
 * evitando los problemas de parseo de Safari con el formato " ".
 */
export function parseServerDateTime(value: string): Date {
    const [datePart, timePart = '00:00:00'] = value.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    return new Date(year, month - 1, day, hours, minutes, seconds ?? 0);
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(parseServerDateTime(value));
}

export function formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(parseServerDateTime(`${value} 00:00:00`));
}

export function formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(parseServerDateTime(value.includes(' ') ? value : `${value}:00`));
}

/** Etiqueta legible de un espacio propuesto. */
export function formatSlotLabel(slot: ProposedSlot): string {
    return formatDateTime(slot.start);
}

/** Mensaje de WhatsApp con las opciones de horario propuestas. */
export function buildProposalWhatsAppUrl(patientName: string, slots: ProposedSlot[]): string {
    const lines = slots.map((slot) => `- ${formatSlotLabel(slot)}`).join('\n');

    const message = `Hola ${patientName}, tengo disponibles las siguientes opciones para tu cita:\n\n${lines}\n\n¿Cuál te queda mejor? Muchas gracias.`;

    return buildWhatsAppUrl(message);
}

/** Construye un enlace wa.me para escribirle a un paciente específico. */
export function buildPatientChatUrl(patientName: string, message: string): string {
    return buildWhatsAppUrl(`Hola ${patientName}, ${message}`);
}
