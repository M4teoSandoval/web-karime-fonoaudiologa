import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { type AppointmentStatus, type PaymentStatus, type ProposedSlot } from '@/types';

export const statusLabels: Record<AppointmentStatus, string> = {
    pending: 'Pendiente',
    slots_proposed: 'Horarios propuestos',
    confirmed: 'Confirmada',
    attended: 'Atendida',
    cancelled: 'Cancelada',
    no_show: 'No realizada',
};

export const statusBadgeClasses: Record<AppointmentStatus, string> = {
    pending: 'bg-[#f4e7e8] text-[#c98796]',
    slots_proposed: 'bg-[#7d8f7a]/15 text-[#6f826c]',
    confirmed: 'bg-[#7d8f7a] text-white',
    attended: 'bg-[#51634e] text-white',
    cancelled: 'bg-[#eadedf] text-[#706a67]',
    no_show: 'bg-[#f4e7e8] text-[#a14444]',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
    unset: 'Sin valor definido',
    unpaid: 'Sin pago',
    partial: 'Abono parcial',
    paid: 'Pagada',
};

export const paymentStatusBadgeClasses: Record<PaymentStatus, string> = {
    unset: 'bg-[#eadedf] text-[#706a67]',
    unpaid: 'bg-[#f4e7e8] text-[#c98796]',
    partial: 'bg-[#f3ecdc] text-[#8a6d3b]',
    paid: 'bg-[#eef2ed] text-[#51634e]',
};

export const paymentMethodLabels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    other: 'Otro',
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

/** Fecha corta para listados: "22 oct 2026". */
export function formatDateShort(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(parseServerDateTime(value.includes(' ') ? value : `${value} 00:00:00`));
}

/** Fecha local del navegador en formato Y-m-d (para inputs type="date"). */
export function localTodayIso(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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

/** Construye un enlace wa.me para escribirle a un paciente específico. */
export function buildPatientChatUrl(patientName: string, message: string): string {
    return buildWhatsAppUrl(`Hola ${patientName}, ${message}`);
}
