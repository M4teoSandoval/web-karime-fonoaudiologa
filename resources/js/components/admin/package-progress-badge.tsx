import { Badge } from '@/components/ui/badge';
import { paymentStatusBadgeClasses, paymentStatusLabels } from '@/lib/appointments';
import { type PackageReference } from '@/types';
import { Layers } from 'lucide-react';

interface PackageProgressBadgeProps {
    package: PackageReference | null | undefined;
    showPayment?: boolean;
}

/**
 * Identificación discreta de una sesión dentro de su paquete. Se usa en la
 * agenda y en los listados para que Karime reconozca de inmediato que la cita
 * forma parte de un proceso más largo.
 */
export default function PackageProgressBadge({ package: reference, showPayment = true }: PackageProgressBadgeProps) {
    if (!reference) {
        return null;
    }

    return (
        <>
            <Badge
                variant="secondary"
                className="inline-flex items-center gap-1 rounded-full bg-[#f3ecdc] px-2 py-0.5 text-[10px] font-bold text-[#8a6d3b]"
            >
                <Layers className="size-3" />
                Sesión {reference.session_number ?? '—'} de {reference.sessions_count}
            </Badge>

            {showPayment && (
                <Badge
                    variant="secondary"
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${paymentStatusBadgeClasses[reference.payment_status]}`}
                >
                    {paymentStatusLabels[reference.payment_status]}
                </Badge>
            )}
        </>
    );
}
