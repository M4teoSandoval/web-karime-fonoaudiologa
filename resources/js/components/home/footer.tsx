import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

export function Footer() {
    const { site } = usePage<SharedData>().props;
    const { footer } = site;

    // El año se toma del sistema para que el aviso no quede desactualizado.
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-[#eadedf] bg-[#fcf9f7] py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
                    {/* Copyright */}
                    <div>
                        <p className="text-sm font-semibold text-[#373432]">
                            © {year} {footer.copyright_holder}
                        </p>

                        <p className="mt-1 text-sm text-[#706a67]">
                            Todos los derechos reservados
                        </p>
                    </div>

                    {/* Ubicación */}
                    <p className="flex items-center gap-2 text-sm text-[#706a67]">
                        <MapPin className="size-4 shrink-0 text-[#7d8f7a]" />

                        {footer.location}
                    </p>
                </div>

                {/* Crédito de desarrollo */}
                <div className="mt-10 border-t border-[#eadedf] pt-6">
                    <p className="text-xs text-[#b3aaa6]">
                        Desarrollado por{' '}
                        <a
                            href={footer.developer_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#706a67] underline-offset-4 transition-colors duration-300 hover:text-[#7d8f7a] hover:underline"
                        >
                            {footer.developer_label}
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
