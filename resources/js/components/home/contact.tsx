import { motion } from 'framer-motion';
import {
    ArrowUpRight,
    Instagram,
    MapPin,
    MessageCircle,
} from 'lucide-react';

const fadeUp = {
    hidden: {
        opacity: 0,
        y: 24,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
        },
    },
};

export function Contact() {
    return (
        <section
            id="contacto"
            className="relative overflow-hidden bg-[#f4eee9] py-24 sm:py-32 lg:py-40"
        >
            {/* =================================================
                DECORATIVE BACKGROUND
            ================================================= */}

            <div className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-[#7d8f7a]/10 blur-3xl" />

            <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[#d99aa8]/10 blur-3xl" />

            {/* Decorative circles */}
            <div className="pointer-events-none absolute right-[12%] top-20 hidden size-28 rounded-full border border-[#7d8f7a]/20 lg:block" />

            <div className="pointer-events-none absolute bottom-24 left-[8%] hidden size-20 rounded-full border border-[#d99aa8]/25 lg:block" />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
                <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
                    {/* =================================================
                        LEFT — CONTACT INFORMATION
                    ================================================= */}

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        className="max-w-xl"
                    >
                        <motion.div
                            variants={fadeUp}
                            className="mb-7 flex items-center gap-3"
                        >
                            <span className="h-px w-10 bg-[#d99aa8]" />

                            <span className="text-[13px] font-bold tracking-[0.18em] text-[#7d8f7a] uppercase">
                                Contacto
                            </span>
                        </motion.div>

                        <motion.h2
                            variants={fadeUp}
                            className="max-w-lg text-[3rem] leading-[0.98] font-normal tracking-[-0.04em] text-[#373432] sm:text-5xl lg:text-[4.4rem]"
                        >
                            Tu bienestar
                            <span className="block font-brand text-[#d99aa8]">
                                comienza aquí.
                            </span>
                        </motion.h2>

                        <motion.p
                            variants={fadeUp}
                            className="mt-7 max-w-lg text-base leading-7 text-[#706a67] sm:text-lg"
                        >
                            Si tienes alguna pregunta o quieres agendar una
                            cita, puedes comunicarte directamente con Karime.
                            Será un gusto acompañarte.
                        </motion.p>

                        {/* Contact cards */}
                        <div className="mt-10 space-y-4">
                            {/* WhatsApp */}
                            <motion.a
                                variants={fadeUp}
                                href="https://wa.me/573150596654"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 rounded-2xl border border-[#7d8f7a]/15 bg-white/70 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_15px_40px_rgba(85,72,74,0.08)]"
                            >
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#7d8f7a]/10 text-[#7d8f7a] transition-colors duration-300 group-hover:bg-[#7d8f7a] group-hover:text-white">
                                    <MessageCircle className="size-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold tracking-[0.12em] text-[#7d8f7a] uppercase">
                                        WhatsApp
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[#373432]">
                                        315 059 6654
                                    </p>
                                </div>

                                <ArrowUpRight className="size-4 text-[#706a67] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#7d8f7a]" />
                            </motion.a>

                            {/* Instagram */}
                            <motion.a
                                variants={fadeUp}
                                href="https://www.instagram.com/karime.fonoaudio/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 rounded-2xl border border-[#d99aa8]/15 bg-white/70 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_15px_40px_rgba(85,72,74,0.08)]"
                            >
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#d99aa8]/10 text-[#d99aa8] transition-colors duration-300 group-hover:bg-[#d99aa8] group-hover:text-white">
                                    <Instagram className="size-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold tracking-[0.12em] text-[#d99aa8] uppercase">
                                        Instagram
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[#373432]">
                                        @karime.fonoaudio
                                    </p>
                                </div>

                                <ArrowUpRight className="size-4 text-[#706a67] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#d99aa8]" />
                            </motion.a>

                            {/* Address */}
                            <motion.div
                                variants={fadeUp}
                                className="flex items-center gap-4 rounded-2xl border border-[#7d8f7a]/15 bg-white/70 p-4"
                            >
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#7d8f7a]/10 text-[#7d8f7a]">
                                    <MapPin className="size-5" />
                                </div>

                                <div>
                                    <p className="text-xs font-bold tracking-[0.12em] text-[#7d8f7a] uppercase">
                                        Consultorio
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[#373432]">
                                        Calle 10 #8A-90
                                    </p>

                                    <p className="text-sm text-[#706a67]">
                                        Santa Rosa del Sur, Bolívar
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* =================================================
                        RIGHT — OFFICE PHOTO COMPOSITION
                    ================================================= */}

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="relative mx-auto w-full max-w-[580px]"
                    >
                        {/* Main office photo */}
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] bg-[#ead8da]">
                            {/* FOTO PRINCIPAL DEL CONSULTORIO */}
                            <div className="flex h-full w-full items-center justify-center">
                                <div className="text-center">
                                    <MapPin className="mx-auto size-8 text-[#7d8f7a]/50" />

                                    <p className="mt-3 text-sm font-bold tracking-[0.12em] text-[#7d8f7a] uppercase">
                                        Foto del consultorio
                                    </p>

                                    <p className="mt-1 text-xs text-[#706a67]">
                                        Agregar después
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Secondary photo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.6,
                                delay: 0.25,
                            }}
                            className="absolute -bottom-10 -left-5 aspect-[4/3] w-44 overflow-hidden rounded-3xl border-8 border-[#f4eee9] bg-[#f4e7e8] shadow-[0_18px_40px_rgba(85,72,74,0.10)] sm:-left-8 sm:w-52"
                        >
                            {/* FOTO SECUNDARIA DEL CONSULTORIO */}
                            <div className="flex h-full w-full items-center justify-center px-4 text-center">
                                <p className="text-[10px] font-bold tracking-[0.12em] text-[#d99aa8] uppercase">
                                    Segunda foto
                                </p>
                            </div>
                        </motion.div>

                        {/* Sage floating badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.6,
                                delay: 0.45,
                            }}
                            className="absolute -right-3 -top-5 flex size-24 items-center justify-center rounded-full bg-[#7d8f7a] shadow-[0_15px_35px_rgba(85,72,74,0.12)] sm:-right-6 sm:-top-6 sm:size-28"
                        >
                            <div className="text-center text-white">
                                <MapPin className="mx-auto mb-1 size-4" />

                                <p className="text-[9px] leading-3 font-bold tracking-widest uppercase">
                                    Estamos
                                    <br />
                                    aquí
                                </p>
                            </div>
                        </motion.div>

                        {/* Decorative border */}
                        <div className="pointer-events-none absolute -bottom-5 -right-5 -z-10 h-full w-full rounded-[32px] border border-[#d99aa8]/30" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}