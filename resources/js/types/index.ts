import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface FlashData {
    type?: 'success' | 'error';
    message?: string;
    whatsapp_url?: string | null;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash: FlashData;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: 'user' | 'admin';
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

/* =================================================
   Sistema de gestión de citas
================================================= */

export type AppointmentStatus = 'pending' | 'slots_proposed' | 'confirmed' | 'cancelled';

export interface ProposedSlot {
    start: string;
    end: string;
}

export interface AppointmentRequest {
    id: number;
    patient_name: string;
    service: string;
    status: AppointmentStatus;
    duration_minutes: number;
    proposed_slots: ProposedSlot[] | null;
    confirmed_start: string | null;
    confirmed_end: string | null;
    notes: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
}

export interface ScheduleDayConfig {
    id?: number;
    day_of_week: number;
    day_name: string;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

export interface AvailabilityBlockItem {
    id: number;
    date: string;
    is_full_day: boolean;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
}

export interface AgendaAppointmentItem {
    id: number;
    patient_name: string;
    service: string;
    duration_minutes: number;
    start: string;
    end: string;
}

export interface AgendaDay {
    date: string;
    day_name: string;
    day_number: string;
    schedule: { start_time: string; end_time: string } | null;
    appointments: AgendaAppointmentItem[];
    blocks: {
        id: number;
        is_full_day: boolean;
        start_time: string | null;
        end_time: string | null;
        reason: string | null;
    }[];
}
