import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { serviceNames } from '@/data/services';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, LoaderCircle, RotateCcw } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

const fadeUp: Variants = {
    hidden: {
        opacity: 0,
        y: 24,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            ease: 'easeOut',
        },
    },
};

interface ClientErrors {
    patient_name?: string;
    service?: string;
}

const steps = [
    { number: '01', title: 'Cuéntame quién eres', description: 'Solo necesito tu nombre.' },
    { number: '02', title: 'Elige tu servicio', description: 'Selecciona el acompañamiento que necesitas.' },
    { number: '03', title: 'Coordinemos por WhatsApp', description: 'Te confirmo la disponibilidad y elegimos el mejor horario.' },
];

export function Booking() {
    /* En móvil el formulario y el texto se muestran ya visibles, sin reveal de scroll (ver About). */
    const isMobile = useIsMobile();

    const { flash } = usePage<SharedData>().props;

    const [clientErrors, setClientErrors] = useState<ClientErrors>({});
    const [successUrl, setSuccessUrl] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        patient_name: '',
        service: '',
    });

    useEffect(() => {
        if (flash?.whatsapp_url) {
            setSuccessUrl(flash.whatsapp_url);
            window.open(flash.whatsapp_url, '_blank', 'noopener,noreferrer');
        }
    }, [flash?.whatsapp_url]);

    const validate = (): boolean => {
        const next: ClientErrors = {};

        if (data.patient_name.trim().length < 2) {
            next.patient_name = 'Por favor escribe tu nombre.';
        }

        if (!serviceNames.includes(data.service)) {
            next.service = 'Por favor selecciona un servicio.';
        }

        setClientErrors(next);

        return Object.keys(next).length === 0;
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        post(route('appointments.store'), {
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setSuccessUrl(null);
        setClientErrors({});
        reset();
    };

    return (
        <section id="agenda" className="relative overflow-hidden bg-[#fcf9f7] py-24 sm:py-32">
            {/* Decorative background */}
            <div className="perf-glow pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-[#d99aa8]/8 blur-3xl" aria-hidden="true" />

            <div className="perf-glow pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-[#7d8f7a]/10 blur-3xl" aria-hidden="true" />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
                <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
                    {/* =================================================
                        LEFT — COPY
                    ================================================= */}
                    <motion.div initial={isMobile ? 'visible' : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="max-w-xl lg:sticky lg:top-32">
                        <motion.div variants={fadeUp} className="mb-7 flex items-center gap-3">
                            <span className="h-px w-10 bg-[#d99aa8]" />

                            <span className="text-[13px] font-bold tracking-[0.18em] text-[#7d8f7a] uppercase">Agenda</span>
                        </motion.div>

                        <motion.h2 variants={fadeUp} className="text-[2.8rem] leading-[1] font-normal tracking-[-0.04em] text-[#373432] sm:text-5xl lg:text-[4.2rem]">
                            Agenda tu cita
                            <span className="font-script block text-[#d99aa8]">en pocos pasos.</span>
                        </motion.h2>

                        <motion.p variants={fadeUp} className="mt-7 max-w-lg text-base leading-7 text-[#706a67] sm:text-lg">
                            Registra tu solicitud y continuamos la coordinación directamente por WhatsApp. Juntas(os) elegiremos el horario que
                            mejor se adapte a ti.
                        </motion.p>

                        {/* Steps */}
                        <motion.ol variants={fadeUp} className="mt-10 space-y-5">
                            {steps.map((step) => (
                                <li key={step.number} className="flex items-start gap-4">
                                    <span className="mt-1 text-[11px] font-bold tracking-widest text-[#d99aa8]">{step.number}</span>

                                    <div>
                                        <p className="text-sm font-bold text-[#373432]">{step.title}</p>

                                        <p className="mt-0.5 text-sm leading-6 text-[#706a67]">{step.description}</p>
                                    </div>
                                </li>
                            ))}
                        </motion.ol>
                    </motion.div>

                    {/* =================================================
                        RIGHT — FORM CARD
                    ================================================= */}
                    <motion.div
                        initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="w-full max-w-xl"
                    >
                        <div className="rounded-[32px] border border-[#eadedf] bg-white p-7 shadow-[0_24px_60px_rgba(85,72,74,0.07)] sm:p-10">
                            {successUrl ? (
                                /* =================================================
                                    SUCCESS STATE
                                ================================================= */
                                <div className="flex flex-col items-center py-6 text-center">
                                    <div className="flex size-16 items-center justify-center rounded-full bg-[#7d8f7a]/12 text-[#7d8f7a]">
                                        <CheckCircle2 className="size-7" strokeWidth={1.8} />
                                    </div>

                                    <h3 className="mt-6 text-2xl tracking-[-0.02em] text-[#373432]">¡Solicitud registrada!</h3>

                                    <p className="mt-3 max-w-sm text-sm leading-6 text-[#706a67]">
                                        Guardé tu solicitud correctamente. Se abrió WhatsApp con tu mensaje; si no ocurrió, puedes abrirlo
                desde este botón y consultar mi disponibilidad.
                                    </p>

                                    <a
                                        href={successUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group mt-7 inline-flex items-center rounded-full bg-[#7d8f7a] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(125,143,122,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6d7f6a]"
                                    >
                                        Abrir WhatsApp
                                        <ArrowUpRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </a>

                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#706a67] transition-colors duration-300 hover:text-[#d99aa8]"
                                    >
                                        <RotateCcw className="size-4" />
                                        Registrar otra solicitud
                                    </button>
                                </div>
                            ) : (
                                /* =================================================
                                    FORM STATE
                                ================================================= */
                                <form onSubmit={handleSubmit} noValidate>
                                    <p className="text-[12px] font-bold tracking-[0.2em] text-[#7d8f7a] uppercase">Solicitud de cita</p>

                                    <h3 className="mt-3 text-2xl tracking-[-0.02em] text-[#373432]">¿En qué puedo acompañarte?</h3>

                                    <p className="mt-2 text-sm leading-6 text-[#706a67]">
                                        Completa tus datos y tu solicitud quedará registrada. Luego coordinamos los detalles por WhatsApp.
                                    </p>

                                    <div className="mt-8 space-y-5">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="patient_name" className="text-[#373432]">
                                                Tu nombre
                                            </Label>

                                            <Input
                                                id="patient_name"
                                                name="patient_name"
                                                type="text"
                                                autoComplete="name"
                                                placeholder="Escribe tu nombre completo"
                                                value={data.patient_name}
                                                onChange={(event) => setData('patient_name', event.target.value)}
                                                aria-invalid={Boolean(clientErrors.patient_name ?? errors.patient_name)}
                                                className="h-12 rounded-xl border-[#ded4d4] bg-[#fcfaf9] px-4 text-[15px] text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-[#d99aa8]"
                                            />

                                            <InputError message={clientErrors.patient_name ?? errors.patient_name} />
                                        </div>

                                        {/* Service */}
                                        <div className="space-y-2">
                                            <Label htmlFor="service" className="text-[#373432]">
                                                Servicio
                                            </Label>

                                            <Select
                                                value={data.service}
                                                onValueChange={(value) => setData('service', value)}
                                            >
                                                <SelectTrigger
                                                    id="service"
                                                    aria-invalid={Boolean(clientErrors.service ?? errors.service)}
                                                    className="h-12 w-full rounded-xl border-[#ded4d4] bg-[#fcfaf9] px-4 text-[15px] text-[#373432] focus:ring-[#d99aa8]"
                                                >
                                                    <SelectValue placeholder="Selecciona un servicio" />
                                                </SelectTrigger>

                                                <SelectContent className="rounded-xl border-[#eadedf] bg-white">
                                                    {serviceNames.map((name) => (
                                                        <SelectItem key={name} value={name} className="rounded-lg text-[15px] text-[#373432]">
                                                            {name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <InputError message={clientErrors.service ?? errors.service} />
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="mt-8 h-12 w-full rounded-full bg-[#d99aa8] text-sm font-bold text-white shadow-[0_12px_30px_rgba(217,154,168,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c98796] hover:shadow-[0_14px_34px_rgba(217,154,168,0.28)]"
                                    >
                                        {processing && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                                        Registrar solicitud
                                    </Button>

                                    <p className="mt-4 text-center text-xs leading-5 text-[#706a67]">
                                        Al registrar tu solicitud se abrirá WhatsApp para que consultes mi disponibilidad. Tus datos solo se
                                        usan para coordinar tu cita.
                                    </p>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
