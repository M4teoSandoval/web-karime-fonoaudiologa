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

export type AppointmentStatus = 'pending' | 'slots_proposed' | 'confirmed' | 'attended' | 'cancelled' | 'no_show';

export type PaymentStatus = 'unset' | 'unpaid' | 'partial' | 'paid';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface ProposedSlot {
    start: string;
    end: string;
}

export interface PatientSummary {
    id: number;
    name: string;
    phone: string | null;
    created_at?: string | null;
}

export interface PatientListItem extends PatientSummary {
    appointments_count: number;
    last_appointment_at: string | null;
    total_paid_cents: number;
    outstanding_cents: number;
}

export interface Payment {
    id: number;
    appointment_id: number;
    amount_cents: number;
    paid_on: string;
    method: PaymentMethod | null;
    notes: string | null;
    recorded_by_name: string | null;
    voided_at: string | null;
    void_reason: string | null;
    voided_by_name: string | null;
    created_at: string | null;
    appointment?: {
        id: number;
        service: string;
        confirmed_start: string | null;
        patient_name: string;
    } | null;
}

export interface PatientNoteRevision {
    id: number;
    body: string;
    edited_by_name: string | null;
    created_at: string | null;
}

export interface PatientNote {
    id: number;
    body: string;
    noted_at: string;
    created_at: string | null;
    updated_at: string | null;
    author_name: string | null;
    appointment: {
        id: number;
        service: string;
        confirmed_start: string | null;
    } | null;
    revisions: PatientNoteRevision[];
}

export interface AppointmentRequest {
    id: number;
    patient_id: number | null;
    patient_name: string;
    patient_phone: string | null;
    service: string;
    status: AppointmentStatus;
    source: 'public' | 'manual';
    duration_minutes: number;
    service_value_cents: number | null;
    total_paid_cents: number;
    balance_cents: number | null;
    payment_status: PaymentStatus;
    confirmed_start: string | null;
    confirmed_end: string | null;
    attended_at: string | null;
    cancelled_at: string | null;
    no_show_at: string | null;
    created_at: string;
    updated_at?: string | null;

    /* Presentes en el detalle de la cita. */
    proposed_slots?: ProposedSlot[] | null;
    notes?: string | null;
    patient?: PatientSummary | null;
    payments?: Payment[];

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

export interface AgendaAppointmentItem extends AppointmentRequest {
    start: string | null;
    end: string | null;
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

export interface DashboardMonthSummary {
    period: string;
    label: string;
    income_cents: number;
    attended_count: number;
}
