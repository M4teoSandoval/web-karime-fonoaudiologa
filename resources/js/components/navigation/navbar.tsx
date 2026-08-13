import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Menu } from 'lucide-react';

const navItems = [
    { title: 'Inicio', href: '/#inicio' },
    { title: 'Servicios', href: '/#servicios' },
    { title: 'Sobre mí', href: '/#sobre-mi' },
    { title: 'Contacto', href: '/#contacto' },
];

const whatsappUrl =
    'https://wa.me/573150596654?text=Quisiera%20agendar%20una%20cita.%20Me%20gustar%C3%ADa%20conocer%20la%20disponibilidad%20y%20recibir%20m%C3%A1s%20informaci%C3%B3n.';

export function Navbar() {
    const { auth } = usePage<SharedData>().props;

    return (
        <header className="fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-[28px] border border-[#eadedf]/80 bg-[#fcf9f7]/90 shadow-[0_12px_40px_rgba(55,52,50,0.08)] backdrop-blur-xl">
                    <div className="flex h-[72px] items-center justify-between px-5 sm:px-7">
                        {/* =================================================
                            BRAND
                        ================================================= */}
                        <Link href={route('home')} className="group flex items-center gap-3">
                            <img
                                src="/images/branding/logo-karime-sandoval.png"
                                alt="Karime Sandoval"
                                className="h-13 w-auto transition-transform duration-300 group-hover:scale-[1.02]"
                            />

                            <span className="font-brand text-[35px] leading-none text-[#373432] transition-colors duration-300 group-hover:text-[#d99aa8]">
                                Karime Sandoval
                            </span>
                        </Link>

                        {/* =================================================
                            DESKTOP NAVIGATION
                        ================================================= */}
                        <nav className="hidden items-center gap-1 lg:flex">
                            {navItems.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="relative rounded-full px-4 py-2 text-[15px] font-medium text-[#706a67] transition-all duration-300 hover:bg-[#7d8f7a]/10 hover:text-[#373432]"
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </nav>

                        {/* =================================================
                            DESKTOP CTA
                        ================================================= */}
                        <div className="hidden lg:flex">
                            {auth.user ? (
                                <Button
                                    asChild
                                    className="rounded-full bg-[#7d8f7a] px-5 text-white shadow-[0_8px_20px_rgba(125,143,122,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6f816c] hover:shadow-[0_10px_25px_rgba(125,143,122,0.24)]"
                                >
                                    <Link href={route('dashboard')}>Dashboard</Link>
                                </Button>
                            ) : (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group inline-flex h-11 items-center rounded-full bg-[#d99aa8] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(217,154,168,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c98796] hover:shadow-[0_12px_28px_rgba(217,154,168,0.28)]"
                                >
                                    Agendar cita
                                    <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </a>
                            )}
                        </div>

                        {/* =================================================
                            MOBILE
                        ================================================= */}
                        <div className="lg:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-10 rounded-full text-[#373432] transition-colors hover:bg-[#f4e7e8]"
                                        aria-label="Abrir menú"
                                    >
                                        <Menu className="size-5" />
                                    </Button>
                                </SheetTrigger>

                                <SheetContent side="right" className="w-[88%] border-[#eadedf] bg-[#fcf9f7] sm:max-w-sm">
                                    <SheetHeader className="border-b border-[#eadedf] pb-5">
                                        <SheetTitle className="text-left">
                                            <span className="font-brand text-3xl font-normal text-[#373432]">Karime Sandoval</span>
                                        </SheetTitle>
                                    </SheetHeader>

                                    <nav className="mt-8 flex flex-col">
                                        {navItems.map((item, index) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className="group border-b border-[#eadedf] py-5 text-lg font-medium text-[#373432] transition-colors hover:text-[#d99aa8]"
                                            >
                                                <span className="mr-4 text-xs text-[#7d8f7a]">0{index + 1}</span>

                                                {item.title}

                                                <span className="float-right mt-1 h-px w-0 bg-[#d99aa8] transition-all duration-300 group-hover:w-6" />
                                            </Link>
                                        ))}
                                    </nav>

                                    <div className="mt-auto">
                                        {auth.user ? (
                                            <Button asChild className="w-full rounded-full bg-[#7d8f7a] py-6 text-white hover:bg-[#6f816c]">
                                                <Link href={route('dashboard')}>Dashboard</Link>
                                            </Button>
                                        ) : (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex w-full items-center justify-center rounded-full bg-[#d99aa8] py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(217,154,168,0.20)] transition-all duration-300 hover:bg-[#c98796]"
                                            >
                                                Agendar cita
                                                <ArrowUpRight className="ml-2 size-4" />
                                            </a>
                                        )}

                                        <p className="mt-4 text-center text-xs leading-5 text-[#706a67]">
                                            Atención especializada para todas las etapas de la vida.
                                        </p>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
