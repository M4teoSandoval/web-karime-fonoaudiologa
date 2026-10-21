import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { services } from '@/data/services';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: {
        opacity: 0,
        y: 24,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1] as const,
        },
    },
};

export function Services() {
    /*
        En móvil detenemos los dos círculos decorativos que flotan en
        bucle y mostramos el contenido sin reveal ligado al scroll:
        son animaciones continuas/de capa que en Safari iOS fuerzan
        recomposición durante el scroll. En escritorio (>=768px) todo
        se mantiene exactamente igual.
    */
    const isMobile = useIsMobile();

    return (
        <section id="servicios" className="relative overflow-hidden bg-[#fcf9f7] py-24 sm:py-32">
            {/* =========================================================
                DECORATIVE BACKGROUND
            ========================================================= */}

            {/* Soft pink glow */}
            <div
                className="perf-glow pointer-events-none absolute top-0 -right-40 h-[450px] w-[450px] rounded-full bg-[#d99aa8]/8 blur-3xl"
                aria-hidden="true"
            />

            {/* Soft sage glow */}
            <div
                className="perf-glow pointer-events-none absolute -bottom-48 -left-40 h-[500px] w-[500px] rounded-full bg-[#7d8f7a]/10 blur-3xl"
                aria-hidden="true"
            />

            {/* =========================================================
                AUDIOLOGY DECORATION
                Large subtle ear + sound waves
            ========================================================= */}

            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                {/* Large ear outline */}
                <motion.svg
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
                    className="absolute top-[80px] -right-[190px] hidden h-[560px] w-[560px] text-[#7d8f7a]/[0.09] lg:block"
                    viewBox="0 0 400 400"
                    fill="none"
                >
                    <path
                        d="M252 72C187 31 104 61 75 127C48 188 65 250 111 286C132 303 143 322 143 343"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />

                    <path
                        d="M207 111C169 91 126 105 108 140C91 173 101 211 130 233C154 251 166 267 166 294"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />

                    <path
                        d="M184 147C164 137 143 144 134 163C125 183 132 203 150 214C169 225 181 242 181 263"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />

                    <path d="M276 105C320 133 340 180 334 226C329 266 306 298 271 318" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </motion.svg>

                {/* Sound wave on the left */}
                <motion.svg
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                        duration: 1,
                        delay: 0.15,
                        ease: [0.22, 1, 0.36, 1] as const,
                    }}
                    className="absolute bottom-[90px] -left-[80px] h-[220px] w-[420px] text-[#d99aa8]/[0.09]"
                    viewBox="0 0 420 220"
                    fill="none"
                >
                    <path
                        d="M0 110C35 110 35 55 70 55C105 55 105 165 140 165C175 165 175 35 210 35C245 35 245 185 280 185C315 185 315 75 350 75C385 75 385 110 420 110"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />

                    <path
                        d="M0 110C35 110 35 80 70 80C105 80 105 140 140 140C175 140 175 65 210 65C245 65 245 155 280 155C315 155 315 95 350 95C385 95 385 110 420 110"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </motion.svg>

                {/* Small floating circles */}
                <motion.div
                    animate={
                        isMobile
                            ? { y: 0, rotate: 0 }
                            : { y: [0, -10, 0], rotate: [0, 3, 0] }
                    }
                    transition={
                        isMobile
                            ? undefined
                            : {
                                  duration: 7,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                              }
                    }
                    className="absolute top-[18%] right-[28%] size-5 rounded-full border border-[#d99aa8]/20"
                />

                <motion.div
                    animate={
                        isMobile
                            ? { y: 0, rotate: 0 }
                            : { y: [0, 8, 0], rotate: [0, -3, 0] }
                    }
                    transition={
                        isMobile
                            ? undefined
                            : {
                                  duration: 8,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                              }
                    }
                    className="absolute right-[12%] bottom-[18%] size-8 rounded-full border border-[#7d8f7a]/20"
                />

                <div className="absolute top-[20%] left-[13%] size-2 rounded-full bg-[#d99aa8]/20" />

                <div className="absolute top-[48%] right-[9%] size-2.5 rounded-full bg-[#7d8f7a]/20" />
            </div>

            {/* =========================================================
                MAIN CONTENT
            ========================================================= */}

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
                {/* Section heading */}
                <motion.div
                    initial={isMobile ? 'visible' : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={containerVariants}
                    className="mx-auto mb-16 max-w-2xl text-center"
                >
                    <motion.div variants={itemVariants} className="mb-5 flex items-center justify-center gap-3">
                        <span className="h-px w-8 bg-[#d99aa8]" />

                        <span className="text-[12px] font-bold tracking-[0.2em] text-[#7d8f7a] uppercase">Servicios</span>

                        <span className="h-px w-8 bg-[#d99aa8]" />
                    </motion.div>

                    <motion.h2 variants={itemVariants} className="text-4xl leading-tight font-normal tracking-[-0.03em] text-[#373432] sm:text-5xl">
                        Un acompañamiento
                        <span className="font-script block text-[#d99aa8]">pensado para ti.</span>
                    </motion.h2>

                    <motion.p variants={itemVariants} className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#706a67] sm:text-lg">
                        Atención especializada en Santa Rosa del Sur para diferentes necesidades de comunicación, habla, voz, deglución y
                        audición.
                    </motion.p>
                </motion.div>

                {/* =========================================================
                    SERVICES GRID
                ========================================================= */}

                <motion.div
                    initial={isMobile ? 'visible' : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={containerVariants}
                    className="relative grid gap-5 md:grid-cols-2 lg:grid-cols-3"
                >
                    {services.map((service, index) => {
                        const Icon = service.icon;
                        const isPink = service.color === 'pink';

                        return (
                            <motion.div
                                key={service.title}
                                variants={itemVariants}
                                whileHover={{ y: -6 }}
                                transition={{
                                    duration: 0.25,
                                    ease: 'easeOut',
                                }}
                            >
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <button
                                            type="button"
                                            className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[28px] border bg-white p-7 text-left transition-all duration-300 outline-none hover:shadow-[0_20px_50px_rgba(85,72,74,0.08)] focus-visible:ring-2 focus-visible:ring-[#d99aa8] ${
                                                isPink ? 'border-[#d99aa8]/20' : 'border-[#7d8f7a]/20'
                                            }`}
                                        >
                                            {/* Number */}
                                            <span
                                                className={`absolute top-6 right-6 text-[11px] font-bold tracking-widest ${
                                                    isPink ? 'text-[#d99aa8]/50' : 'text-[#7d8f7a]/50'
                                                }`}
                                            >
                                                {String(index + 1).padStart(2, '0')}
                                            </span>

                                            {/* Icon */}
                                            <div
                                                className={`mb-8 flex size-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105 group-hover:rotate-2 ${
                                                    isPink ? 'bg-[#d99aa8]/12 text-[#c98796]' : 'bg-[#7d8f7a]/12 text-[#6f826c]'
                                                }`}
                                            >
                                                <Icon className="size-6" strokeWidth={1.6} />
                                            </div>

                                            {/* Content */}
                                            <h3 className="max-w-[250px] text-xl font-semibold tracking-[-0.02em] text-[#373432]">{service.title}</h3>

                                            <p className="mt-3 text-sm leading-6 text-[#706a67]">{service.shortDescription}</p>

                                            {/* More */}
                                            <div
                                                className={`mt-auto inline-flex items-center pt-7 text-sm font-bold ${
                                                    isPink ? 'text-[#c98796]' : 'text-[#6f826c]'
                                                }`}
                                            >
                                                <span>Conocer más</span>

                                                <ArrowUpRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </div>

                                            {/* Decorative circle */}
                                            <div
                                                className={`pointer-events-none absolute -right-16 -bottom-16 size-32 rounded-full transition-transform duration-500 group-hover:scale-125 ${
                                                    isPink ? 'bg-[#d99aa8]/6' : 'bg-[#7d8f7a]/6'
                                                }`}
                                            />
                                        </button>
                                    </DialogTrigger>

                                    {/* =================================================
                                        DETAIL MODAL
                                    ================================================= */}

                                    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] border-[#d99aa8]/20 bg-[#fcf9f7] sm:max-w-lg">
                                        <DialogHeader className="text-left">
                                            <div
                                                className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${
                                                    isPink ? 'bg-[#d99aa8]/12 text-[#c98796]' : 'bg-[#7d8f7a]/12 text-[#6f826c]'
                                                }`}
                                            >
                                                <Icon className="size-6" strokeWidth={1.6} />
                                            </div>

                                            <DialogTitle className="text-2xl tracking-[-0.02em] text-[#373432]">{service.title}</DialogTitle>

                                            <DialogDescription className="pt-2 text-sm leading-6 text-[#706a67]">
                                                {service.shortDescription}
                                            </DialogDescription>
                                        </DialogHeader>

                                        {service.details.length > 0 && (
                                            <div className="mt-5">
                                                <h4 className="mb-4 text-sm font-bold tracking-wide text-[#55484a]">¿Qué podemos trabajar?</h4>

                                                <ul className="space-y-3">
                                                    {service.details.map((detail) => (
                                                        <li key={detail} className="flex gap-3 text-sm leading-6 text-[#706a67]">
                                                            <span
                                                                className={`mt-2 size-1.5 shrink-0 rounded-full ${
                                                                    isPink ? 'bg-[#d99aa8]' : 'bg-[#7d8f7a]'
                                                                }`}
                                                            />

                                                            <span>{detail}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="mt-7 border-t border-[#373432]/8 pt-6">
                                            <DialogClose asChild>
                                                <a
                                                    href="#agenda"
                                                    onClick={() => {
                                                        // Dejar que DialogClose cierre primero; luego scrollear
                                                        setTimeout(() => {
                                                            document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }, 200);
                                                    }}
                                                    className={`group inline-flex items-center rounded-full px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 ${
                                                        isPink
                                                            ? 'bg-[#d99aa8] shadow-[0_10px_25px_rgba(217,154,168,0.2)] hover:bg-[#c98796]'
                                                            : 'bg-[#7d8f7a] shadow-[0_10px_25px_rgba(125,143,122,0.2)] hover:bg-[#6f826c]'
                                                    }`}
                                                    >
                                                    Agendar cita
                                                    <ArrowUpRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </a>
                                            </DialogClose>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* =========================================================
                    BOTTOM MESSAGE
                ========================================================= */}

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mt-14 flex flex-col items-center justify-center gap-3 text-center sm:flex-row"
                >
                    <span className="size-2 rounded-full bg-[#d99aa8]" />

                    <p className="text-sm text-[#706a67]">
                        Cada proceso es diferente. <span className="font-semibold text-[#55484a]">La atención también.</span>
                    </p>

                    <span className="size-2 rounded-full bg-[#7d8f7a]" />
                </motion.div>
            </div>
            {/* Organic transition to Services */}
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-20 overflow-hidden" aria-hidden="true">
                <div className="perf-glow absolute -bottom-24 left-[12%] h-48 w-72 rounded-full bg-[#7d8f7a]/10 blur-3xl" />

                <div className="perf-glow absolute -right-10 -bottom-20 h-44 w-64 rounded-full bg-[#d99aa8]/10 blur-3xl" />

                <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="absolute right-0 bottom-0 h-full w-full">
                    <path d="M0 115C190 155 350 160 540 125C760 85 900 35 1110 48C1240 56 1340 82 1440 65V180H0Z" fill="#fcfaf8" />
                </svg>
            </div>
        </section>
    );
}
