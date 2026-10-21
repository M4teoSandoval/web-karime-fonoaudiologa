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

export interface SiteSeo {
    title: string;
    description: string;
}

export interface SiteProfessional {
    name: string;
    full_name: string;
    job_title: string;
    street_address: string;
    locality: string;
    region: string;
    country: string;
    instagram: string;
    image: string;
    social_image: string;
}

export interface SiteFooter {
    copyright_holder: string;
    location: string;
    developer_url: string;
    developer_label: string;
}

export interface SiteConfig {
    url: string;
    name: string;
    phone: string;
    maps_url: string;
    seo: SiteSeo;
    professional: SiteProfessional;
    footer: SiteFooter;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    site: SiteConfig;
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

    /* Mensajes generados por el servidor con los datos reales de la cita. */
    proposal_message?: string | null;
    confirmation_message?: string | null;
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
    start_time: string | null;
    end_time: string | null;
    is_active: boolean;
    intervals: { start_time: string; end_time: string }[];
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
    intervals: { start_time: string; end_time: string }[];
    appointments: AgendaAppointmentItem[];
    blocks: {
        id: number;
        is_full_day: boolean;
        start_time: string | null;
        end_time: string | null;
        reason: string | null;
    }[];
}
