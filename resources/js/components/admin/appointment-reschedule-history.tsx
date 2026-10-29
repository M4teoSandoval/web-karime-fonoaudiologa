import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/appointments';
import { copyToClipboard } from '@/lib/clipboard';
import { type AppointmentRequest } from '@/types';
import { ArrowRight, ClipboardCheck, Copy, History, UserRound } from 'lucide-react';
import { useState } from 'react';

interface AppointmentRescheduleHistoryProps {
    appointment: AppointmentRequest;
}

/**
 * Historial de reprogramaciones y mensaje listo para copiar.
 *
 * Se muestra en el detalle de la cita para conservar la trazabilidad de todos
 * los cambios, incluso si la cita ya fue atendida o cancelada.
 */
export default function AppointmentRescheduleHistory({ appointment }: AppointmentRescheduleHistoryProps) {
    const [copied, setCopied] = useState(false);

    const reschedules = appointment.reschedules ?? [];
    const message = appointment.reschedule_message ?? null;

    if (reschedules.length === 0) {
        return null;
    }

    const handleCopy = async () => {
        if (!message) {
            return;
        }

        const ok = await copyToClipboard(message);

        if (!ok) {
            return;
        }

        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
    };

    return (
        <section className="rounded-2xl border border-[#eadedf] bg-white p-5 sm:p-6" aria-labelledby="reschedule-history-heading">
            <h2 id="reschedule-history-heading" className="flex items-center gap-2 text-lg font-semibold text-[#373432]">
                <History className="size-5 text-[#7d8f7a]" />
                Historial de reprogramaciones
            </h2>

            <p className="mt-1 text-sm text-[#706a67]">
                Cada cambio queda registrado con su horario anterior, el nuevo y la administradora que lo realizó.
            </p>

            <ol className="mt-4 space-y-3">
                {reschedules.map((reschedule) => (
                    <li key={reschedule.id} className="rounded-xl border border-[#eadedf] bg-[#fcfaf9] p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#373432]">
                                <span className="text-[#706a67] line-through decoration-[#c98796]/60">
                                    {formatDateTime(reschedule.previous_start)}
                                </span>

                                <ArrowRight className="size-3.5 shrink-0 text-[#7d8f7a]" />

                                <span className="text-[#51634e]">{formatDateTime(reschedule.new_start)}</span>
                            </p>

                            <p className="text-xs text-[#706a67]">{formatDateTime(reschedule.rescheduled_at)}</p>
                        </div>

                        {reschedule.reason && <p className="mt-2 text-sm leading-6 text-[#706a67]">Motivo: {reschedule.reason}</p>}

                        {reschedule.rescheduled_by_name && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#706a67]">
                                <UserRound className="size-3.5" />
                                Registrada por {reschedule.rescheduled_by_name}
                            </p>
                        )}
                    </li>
                ))}
            </ol>

            {message && (
                <div className="mt-5 rounded-xl bg-[#f4e7e8]/60 p-4">
                    <p className="text-xs font-bold tracking-wide text-[#c98796] uppercase">Mensaje de reprogramación</p>

                    <p className="mt-2 text-sm leading-6 whitespace-pre-line text-[#373432]">{message}</p>

                    <Button
                        type="button"
                        onClick={handleCopy}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#373432] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4d4744]"
                    >
                        {copied ? <ClipboardCheck className="size-4" /> : <Copy className="size-4" />}
                        {copied ? 'Mensaje copiado' : 'Copiar mensaje'}
                    </Button>

                    <p className="mt-2 text-xs text-[#706a67]">No se envía automáticamente. Cópialo y compártelo por el canal que prefieras.</p>
                </div>
            )}
        </section>
    );
}
