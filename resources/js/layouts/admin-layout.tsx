import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ClipboardList, Clock, ExternalLink, LayoutGrid, LogOut, Users, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

const navItems = [
    { title: 'Resumen', href: '/admin', icon: LayoutGrid, exact: true },
    { title: 'Solicitudes', href: '/admin/solicitudes', icon: ClipboardList, exact: false },
    { title: 'Agenda', href: '/admin/agenda', icon: CalendarDays, exact: false },
    { title: 'Pacientes', href: '/admin/pacientes', icon: Users, exact: false },
    { title: 'Horarios', href: '/admin/horarios', icon: Clock, exact: false },
];

interface AdminLayoutProps {
    title?: string;
    children: ReactNode;
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
    const { flash } = usePage<SharedData>().props;
    const { url } = usePage();

    const [flashVisible, setFlashVisible] = useState(false);

    useEffect(() => {
        if (flash?.message) {
            setFlashVisible(true);

            const timer = setTimeout(() => setFlashVisible(false), 6000);

            return () => clearTimeout(timer);
        }

        return undefined;
    }, [flash?.message, flash?.type]);

    const isActive = (item: (typeof navItems)[number]) => (item.exact ? url === item.href : url.startsWith(item.href));

    return (
        <div className="min-h-screen bg-[#fcf9f7] text-[#373432]">
            <Head title={title ? `${title} · Karime Sandoval` : 'Karime Sandoval'}>
                {/* El panel es privado: nunca debe indexarse. */}
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            {/* =================================================
                HEADER
            ================================================= */}
            <header className="sticky top-0 z-40 border-b border-[#eadedf] bg-[#fcf9f7]/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
                    {/* Brand */}
                    <Link href="/admin" className="flex shrink-0 items-center gap-3">
                        <img src="/images/branding/logo-karime-sandoval.png" alt="Karime Sandoval" className="h-10 w-auto" />

                        <span className="hidden font-['Bad_Script'] text-3xl leading-tight font-normal text-[#373432] sm:block">Karime Sandoval</span>

                        <span className="hidden rounded-full bg-[#7d8f7a]/12 px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-[#6f826c] uppercase lg:block">
                            Panel
                        </span>
                    </Link>

                    {/* Desktop navigation */}
                    <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación del panel">
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    aria-current={isActive(item) ? 'page' : undefined}
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                                        isActive(item) ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:bg-[#7d8f7a]/10 hover:text-[#373432]'
                                    }`}
                                >
                                    <Icon className="size-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User */}
                    <div className="flex shrink-0 items-center gap-3">
                        {/* <span className="hidden text-sm font-semibold text-[#706a67] sm:block">{auth.user?.name}</span> */}

                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden items-center gap-2 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors duration-200 hover:border-[#7d8f7a] hover:text-[#6f826c] sm:inline-flex"
                        >
                            <ExternalLink className="size-4" />
                            Ver página web
                        </a>

                        <button
                            type="button"
                            onClick={() => router.post(route('logout'))}
                            className="inline-flex items-center gap-2 rounded-full border border-[#eadedf] bg-white px-4 py-2 text-sm font-semibold text-[#706a67] transition-colors duration-200 hover:border-[#d99aa8] hover:text-[#d99aa8]"
                        >
                            <LogOut className="size-4" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>

                {/* Mobile navigation */}
                <nav className="flex gap-1 overflow-x-auto px-5 pb-3 md:hidden" aria-label="Navegación del panel">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                aria-current={isActive(item) ? 'page' : undefined}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${
                                    isActive(item) ? 'bg-[#7d8f7a] text-white' : 'bg-white text-[#706a67] ring-1 ring-[#eadedf]'
                                }`}
                            >
                                <Icon className="size-3.5" />
                                {item.title}
                            </Link>
                        );
                    })}

                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#706a67] ring-1 ring-[#eadedf] transition-colors duration-200 hover:text-[#6f826c]"
                    >
                        <ExternalLink className="size-3.5" />
                        Ver página web
                    </a>
                </nav>
            </header>

            {/* =================================================
                FLASH MESSAGE
            ================================================= */}
            <AnimatePresence>
                {flashVisible && flash?.message && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="sticky top-16 z-30 px-5 pt-4 sm:px-8"
                        role="status"
                    >
                        <div
                            className={`mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-[0_12px_30px_rgba(85,72,74,0.08)] ${
                                flash.type === 'error' ? 'bg-[#fdecec] text-[#a14444]' : 'bg-[#eef2ed] text-[#51634e]'
                            }`}
                        >
                            <span>{flash.message}</span>

                            <button
                                type="button"
                                onClick={() => setFlashVisible(false)}
                                aria-label="Cerrar mensaje"
                                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* =================================================
                CONTENT
            ================================================= */}
            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
                {title && <h1 className="mb-8 text-3xl tracking-[-0.03em] text-[#373432] sm:text-4xl">{title}</h1>}

                {children}
            </main>
        </div>
    );
}
