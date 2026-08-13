import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Menu, ArrowUpRight } from 'lucide-react';

const navItems = [
    { title: 'Inicio', href: '/#inicio' },
    { title: 'Servicios', href: '/#servicios' },
    { title: 'Sobre mí', href: '/#sobre-mi' },
    { title: 'Contacto', href: '/#contacto' },
];

export function Navbar() {
    const { auth } = usePage<SharedData>().props;

    return (
        <header className="fixed inset-x-0 top-0 z-50 ">
            <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
                <div className="border border-[#eadedf]/80 bg-[#fcf9f7]/90 shadow-[0_8px_30px_rgba(85,72,74,0.06)] backdrop-blur-xl">
                    <div className="flex h-[72px] items-center justify-between px-5 sm:px-7">
                        
                        {/* Brand */}
                        <Link
                            href={route('home')}
                            className="group flex items-center gap-3"
                        >
                            <img
                                src="/images/branding/logo-karime-sandoval.png"
                                alt="Karime Sandoval"
                                className="h-13 w-auto"
                            />

                            <span className="font-brand text-[35px] leading-none text-[#373432] transition-colors duration-300 group-hover:text-[#d99aa8]">
                                Karime Sandoval
                            </span>
                        </Link>

                        {/* Desktop navigation */}
                        <nav className="hidden items-center gap-1 lg:flex">
                            {navItems.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="relative px-4 py-2 text-[15px] font-medium text-[#706a67] transition-colors duration-300 hover:text-[#373432]"
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </nav>

                        {/* Desktop CTA */}
                        <div className="hidden lg:flex">
                            {auth.user ? (
                                <Button
                                    asChild
                                    className="rounded-full bg-[#d99aa8] px-5 text-white shadow-none transition-all duration-300 hover:bg-[#c98796] hover:shadow-[0_8px_24px_rgba(217,154,168,0.25)]"
                                >
                                    <Link href={route('dashboard')}>
                                        Dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    className="group rounded-full bg-[#d99aa8] px-5 text-white shadow-none transition-all duration-300 hover:bg-[#c98796] hover:shadow-[0_8px_24px_rgba(217,154,168,0.25)]"
                                >
                                    <Link href="/#contacto">
                                        Agendar cita
                                        <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </Link>
                                </Button>
                            )}
                        </div>

                        {/* Mobile */}
                        <div className="lg:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-10 rounded-full text-[#373432] hover:bg-[#f4e7e8]"
                                        aria-label="Abrir menú"
                                    >
                                        <Menu className="size-5" />
                                    </Button>
                                </SheetTrigger>

                                <SheetContent
                                    side="right"
                                    className="w-[88%] border-[#eadedf] bg-[#fcf9f7] sm:max-w-sm"
                                >
                                    <SheetHeader className="border-b border-[#eadedf] pb-5">
                                        <SheetTitle className="text-left">
                                            <span className="font-brand text-3xl font-normal text-[#373432]">
                                                Karime Sandoval
                                            </span>
                                        </SheetTitle>
                                    </SheetHeader>

                                    <nav className="mt-8 flex flex-col">
                                        {navItems.map((item, index) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className="border-b border-[#eadedf] py-5 text-lg font-medium text-[#373432] transition-colors hover:text-[#d99aa8]"
                                            >
                                                <span className="mr-4 text-xs text-[#7d8f7a]">
                                                    0{index + 1}
                                                </span>
                                                {item.title}
                                            </Link>
                                        ))}
                                    </nav>

                                    <div className="mt-auto">
                                        {auth.user ? (
                                            <Button
                                                asChild
                                                className="w-full rounded-full bg-[#d99aa8] py-6 text-white"
                                            >
                                                <Link href={route('dashboard')}>
                                                    Dashboard
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button
                                                asChild
                                                className="w-full rounded-full bg-[#d99aa8] py-6 text-white"
                                            >
                                                <Link href="/#contacto">
                                                    Agendar cita
                                                    <ArrowUpRight className="ml-2 size-4" />
                                                </Link>
                                            </Button>
                                        )}
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