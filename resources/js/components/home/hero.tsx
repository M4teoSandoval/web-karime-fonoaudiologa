import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';

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

export function Hero() {
    return (
        <section id="inicio" className="relative min-h-screen overflow-hidden bg-[#fcf9f7]">
            {/* =================================================
    BACKGROUND DECORATION
================================================= */}

            {/* Soft pink organic glow — top right */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4 }}
                className="pointer-events-none absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full bg-[#d99aa8]/12 blur-[80px]"
            />

            {/* Soft sage organic glow — bottom left */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.6, delay: 0.15 }}
                className="pointer-events-none absolute -bottom-40 -left-32 h-[480px] w-[480px] rounded-full bg-[#7d8f7a]/12 blur-[85px]"
            />

            {/* Large organic pink shape */}
            <motion.div
                initial={{ opacity: 0, x: 40, rotate: -8 }}
                animate={{ opacity: 1, x: 0, rotate: -4 }}
                transition={{
                    duration: 1.2,
                    delay: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                }}
                className="pointer-events-none absolute top-[18%] -right-20 hidden h-[280px] w-[180px] rounded-[50%] bg-[#d99aa8]/[0.07] blur-[1px] lg:block"
            />

            {/* Large organic sage shape */}
            <motion.div
                initial={{ opacity: 0, x: -40, rotate: 8 }}
                animate={{ opacity: 1, x: 0, rotate: 4 }}
                transition={{
                    duration: 1.2,
                    delay: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                }}
                className="pointer-events-none absolute -bottom-16 left-[18%] hidden h-[220px] w-[130px] rounded-[50%] bg-[#7d8f7a]/[0.06] blur-[1px] lg:block"
            />

            {/* Decorative pink ring */}
            <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="pointer-events-none absolute top-[24%] right-[12%] hidden size-14 rounded-full border border-[#d99aa8]/25 lg:block"
            />

            {/* Decorative sage ring */}
            <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="pointer-events-none absolute bottom-[18%] left-[8%] hidden size-20 rounded-full border border-[#7d8f7a]/20 lg:block"
            />

            {/* Floating pink dot */}
            <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="pointer-events-none absolute top-[24%] right-[12%] hidden size-14 rounded-full border border-[#d99aa8]/30 bg-[#d99aa8]/[0.08] lg:block"
            />

            {/* Floating sage dot */}
            <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="pointer-events-none absolute bottom-[18%] left-[8%] hidden size-20 rounded-full bg-[#7d8f7a]/[0.08] lg:block"
            />

            <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 pt-28 pb-20 sm:px-8 lg:px-12 lg:pt-24">
                <div className="grid w-full items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
                    {/* =================================================
                        LEFT — CONTENT
                    ================================================= */}

                    <motion.div initial="hidden" animate="visible" className="max-w-2xl">
                        {/* Eyebrow */}
                        <motion.div variants={fadeUp} className="mb-7 flex items-center gap-3">
                            <span className="h-px w-10 bg-[#d99aa8]" />

                            <span className="text-[13px] font-bold tracking-[0.18em] text-[#7d8f7a] uppercase">Fonoaudiología & Audición</span>
                        </motion.div>

                        {/* Main title */}
                        <motion.h1
                            variants={fadeUp}
                            className="max-w-xl text-[3.3rem] leading-[0.98] font-normal tracking-[-0.04em] text-[#373432] sm:text-6xl lg:text-[5.4rem]"
                        >
                            La comunicación
                            <span className="font-script block text-[#d99aa8]">también transforma.</span>
                        </motion.h1>

                        {/* Description */}
                        <motion.p variants={fadeUp} className="mt-7 max-w-lg text-base leading-7 text-[#706a67] sm:text-lg">
                            Atención especializada para todas las etapas de la vida, con un acompañamiento cercano, profesional y pensado para las
                            necesidades de cada persona.
                        </motion.p>

                        {/* Actions */}
                        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-4">
                            {/* Primary */}
                            <Link
                                href="/#contacto"
                                className="group inline-flex items-center rounded-full bg-[#7d8f7a] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(125,143,122,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6d7f6a]"
                            >
                                Agendar cita
                                <ArrowUpRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>

                            {/* Secondary */}
                            <Link
                                href="/#servicios"
                                className="group inline-flex items-center rounded-full px-5 py-3.5 text-sm font-bold text-[#55484a] transition-colors duration-300 hover:text-[#d99aa8]"
                            >
                                Conocer servicios
                                <span className="ml-2 h-px w-6 bg-[#d99aa8] transition-all duration-300 group-hover:w-9" />
                            </Link>
                        </motion.div>

                        {/* Credibility statement */}
                        <motion.div variants={fadeUp} className="mt-14 flex items-center gap-4">
                            <div className="flex -space-x-2">
                                <div className="size-8 rounded-full border-2 border-[#fcf9f7] bg-[#7d8f7a]/30" />

                                <div className="size-8 rounded-full border-2 border-[#fcf9f7] bg-[#d99aa8]/30" />

                                <div className="size-8 rounded-full border-2 border-[#fcf9f7] bg-[#ead8da]" />
                            </div>

                            <p className="max-w-xs text-xs leading-5 text-[#706a67]">
                                Un espacio pensado para acompañarte en cada etapa de tu proceso.
                            </p>
                        </motion.div>
                    </motion.div>

                    {/* =================================================
                        RIGHT — IMAGE COMPOSITION
                    ================================================= */}

                    <motion.div
                        initial={{
                            opacity: 0,
                            scale: 0.96,
                            y: 20,
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                        }}
                        transition={{
                            duration: 0.9,
                            delay: 0.15,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="relative mx-auto w-full max-w-[520px]"
                    >
                        {/* Soft animated background shape */}
                        <motion.div
                            animate={{
                                y: [0, -8, 0],
                                rotate: [0, 2, 0],
                            }}
                            transition={{
                                duration: 7,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                            className="absolute -top-8 -right-8 -z-10 h-[75%] w-[75%] rounded-[45%] bg-[#7d8f7a]/10 blur-sm"
                        />

                        {/* Main image frame */}
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[45%_45%_24%_24%] bg-[#f4e7e8]">
                            <img
                                src="/images/karime/karime-profesional.png"
                                alt="Karime Sandoval, fonoaudióloga y audióloga"
                                className="h-full w-full object-cover"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-[#373432]/10 via-transparent to-transparent" />
                        </div>

                        {/* Pink floating label */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: 20,
                            }}
                            animate={{
                                opacity: 1,
                                x: 0,
                            }}
                            transition={{
                                delay: 0.7,
                                duration: 0.6,
                            }}
                            className="absolute -right-3 bottom-16 rounded-2xl bg-[#d99aa8] px-5 py-4 shadow-[0_18px_40px_rgba(85,72,74,0.12)] sm:-right-8"
                        >
                            <p className="font-brand text-2xl leading-none text-white">Atención</p>

                            <p className="mt-1 text-xs font-bold tracking-wider text-white/80 uppercase">personalizada</p>
                        </motion.div>

                        {/* Sage floating circle */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0.8,
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                            }}
                            transition={{
                                delay: 0.9,
                                duration: 0.6,
                            }}
                            className="absolute top-10 -left-4 flex size-20 items-center justify-center rounded-full bg-[#7d8f7a] shadow-[0_15px_35px_rgba(85,72,74,0.10)] sm:-left-8"
                        >
                            <span className="text-center text-[10px] leading-4 font-bold tracking-widest text-white uppercase">
                                Todas
                                <br />
                                las etapas
                            </span>
                        </motion.div>

                        {/* Decorative pink border */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0.97,
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                            }}
                            transition={{
                                delay: 0.5,
                                duration: 0.8,
                            }}
                            className="pointer-events-none absolute -bottom-5 -left-5 -z-10 h-full w-full rounded-[45%_45%_24%_24%] border border-[#d99aa8]/30"
                        />

                        {/* Tiny decorative dot */}
                        <motion.div
                            animate={{
                                y: [0, -6, 0],
                                opacity: [0.5, 0.9, 0.5],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                            className="absolute right-12 -bottom-5 size-3 rounded-full bg-[#d99aa8]"
                        />
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{
                        opacity: 0,
                        y: 10,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        delay: 1.3,
                        duration: 0.6,
                    }}
                    className="absolute bottom-16 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[#706a67] md:flex"
                >
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Descubre</span>

                    <motion.div
                        animate={{
                            y: [0, 5, 0],
                        }}
                        transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <ArrowDown className="size-4 text-[#d99aa8]" />
                    </motion.div>
                </motion.div>
            </div>

            {/* Organic transition to Services */}
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-20 overflow-hidden" aria-hidden="true">
                <div className="absolute -bottom-24 left-[12%] h-48 w-72 rounded-full bg-[#7d8f7a]/10 blur-3xl" />

                <div className="absolute -right-10 -bottom-20 h-44 w-64 rounded-full bg-[#d99aa8]/10 blur-3xl" />

                <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="absolute right-0 bottom-0 h-full w-full">
                    <path d="M0 115C190 155 350 160 540 125C760 85 900 35 1110 48C1240 56 1340 82 1440 65V180H0Z" fill="#fcfaf8" />
                </svg>
            </div>
        </section>
    );
}
