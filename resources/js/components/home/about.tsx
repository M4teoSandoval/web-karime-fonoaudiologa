import { motion } from 'framer-motion';

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

export function About() {
    return (
        <section
            id="sobre-mi"
            className="relative overflow-hidden bg-[#fcf9f7] py-24 sm:py-32 lg:py-40"
        >
            {/* Decorative background */}
            <div className="pointer-events-none absolute -right-40 top-20 h-[420px] w-[420px] rounded-full bg-[#7d8f7a]/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[360px] w-[360px] rounded-full bg-[#d99aa8]/10 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
                <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
                    {/* =================================================
                        LEFT — PHOTO COMPOSITION
                    ================================================= */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{
                            duration: 0.8,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="relative mx-auto w-full max-w-[500px]"
                    >
                        {/* Main photo */}
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-[#ead8da]">
                            {/* FOTO PRINCIPAL — agregar después */}
                            <div className="flex h-full w-full items-center justify-center">
                                <div className="text-center">
                                    <span className="text-sm font-bold tracking-[0.15em] text-[#7d8f7a] uppercase">
                                        Foto de Karime
                                    </span>
                                    <p className="mt-2 text-xs text-[#706a67]">
                                        Foto profesional
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Decorative frame */}
                        <div className="pointer-events-none absolute -bottom-5 -left-5 -z-10 h-full w-full rounded-[32px] border border-[#7d8f7a]/30" />

                        {/* Secondary photo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.6,
                                delay: 0.3,
                            }}
                            className="absolute -right-4 -bottom-8 flex aspect-square w-32 items-center justify-center overflow-hidden rounded-3xl border-8 border-[#fcf9f7] bg-[#f4e7e8] shadow-[0_15px_40px_rgba(85,72,74,0.10)] sm:-right-8 sm:w-40"
                        >
                            {/* FOTO SECUNDARIA — agregar después */}
                            <div className="px-3 text-center">
                                <span className="text-[10px] font-bold tracking-[0.12em] text-[#d99aa8] uppercase">
                                    Segunda foto
                                </span>
                            </div>
                        </motion.div>

                        {/* Small decorative circle */}
                        <div className="absolute -left-5 top-12 flex size-18 items-center justify-center rounded-full bg-[#7d8f7a] shadow-[0_12px_30px_rgba(85,72,74,0.10)] sm:-left-7">
                            <span className="text-center text-[9px] leading-3 font-bold tracking-wider text-white uppercase">
                                Cercanía
                                <br />
                                y confianza
                            </span>
                        </div>
                    </motion.div>

                    {/* =================================================
                        RIGHT — CONTENT
                    ================================================= */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        className="max-w-2xl"
                    >
                        <motion.div
                            variants={fadeUp}
                            className="mb-7 flex items-center gap-3"
                        >
                            <span className="h-px w-10 bg-[#7d8f7a]" />

                            <span className="text-[13px] font-bold tracking-[0.18em] text-[#7d8f7a] uppercase">
                                Sobre mí
                            </span>
                        </motion.div>

                        <motion.h2
                            variants={fadeUp}
                            className="text-[2.8rem] leading-[1] font-normal tracking-[-0.04em] text-[#373432] sm:text-5xl lg:text-[4.2rem]"
                        >
                            Conoce a{' '}
                            <span className="font-brand text-[#d99aa8]">
                                Karime.
                            </span>
                        </motion.h2>

                        <motion.div
                            variants={fadeUp}
                            className="mt-8 space-y-5 text-base leading-7 text-[#706a67] sm:text-lg"
                        >
                            <p>
                                Soy Karime Sandoval, Fonoaudióloga y estudiante
                                de la Especialización en Audiología. Me
                                apasiona acompañar a niños, adolescentes y
                                adultos en sus procesos de comunicación, habla,
                                lenguaje, voz, deglución y audición.
                            </p>

                            <p>
                                Mi propósito es brindar una atención
                                profesional, humana e individualizada,
                                entendiendo que cada paciente tiene necesidades
                                y procesos diferentes.
                            </p>
                        </motion.div>

                        {/* Formation */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-10 border-t border-[#7d8f7a]/20 pt-8"
                        >
                            <p className="mb-6 text-xs font-bold tracking-[0.18em] text-[#7d8f7a] uppercase">
                                Formación profesional
                            </p>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="relative pl-5">
                                    <span className="absolute top-1 left-0 h-3 w-1 rounded-full bg-[#d99aa8]" />

                                    <p className="text-sm font-bold text-[#373432]">
                                        Fonoaudióloga
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#706a67]">
                                        Fundación Universitaria María Cano
                                    </p>

                                    <p className="mt-1 text-xs font-semibold text-[#7d8f7a]">
                                        2024
                                    </p>
                                </div>

                                <div className="relative pl-5">
                                    <span className="absolute top-1 left-0 h-3 w-1 rounded-full bg-[#7d8f7a]" />

                                    <p className="text-sm font-bold text-[#373432]">
                                        Especialización en Audiología
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#706a67]">
                                        Escuela Colombiana de Rehabilitación
                                    </p>

                                    <p className="mt-1 text-xs font-semibold text-[#d99aa8]">
                                        En curso
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
                
            </div>
            
            
        </section>
        
    );
}