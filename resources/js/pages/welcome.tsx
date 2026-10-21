import { About } from '@/components/home/about';
import { Booking } from '@/components/home/booking';
import { Contact } from '@/components/home/contact';
import { Hero } from '@/components/home/hero';
import { Services } from '@/components/home/services';
import { Navbar } from '@/components/navigation/navbar';
import { buildStructuredData } from '@/lib/seo';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { MotionConfig } from 'framer-motion';

export default function Welcome() {
    const { site } = usePage<SharedData>().props;

    // Se escapan "<" para que el JSON-LD nunca pueda cerrar la etiqueta <script>.
    const structuredData = JSON.stringify(buildStructuredData(site)).replace(/</g, '\\u003c');

    return (
        <>
            {/*
                El título, la descripción, el canonical y las etiquetas Open Graph
                se renderizan en el servidor (resources/views/app.blade.php) para
                que estén presentes en el HTML inicial. Aquí solo se añade la
                información estructurada, que depende del catálogo de servicios.
            */}
            <Head title={site.seo.title}>
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
            </Head>

            {/* reducedMotion="user": respeta prefers-reduced-motion del dispositivo sin desactivar animaciones para el resto. */}
            <MotionConfig reducedMotion="user">
                <div className="min-h-svh bg-[#fcf9f7]">
                    <Navbar />
                    <main>
                        <Hero />
                        <Services />
                        <About />
                        <Booking />
                        <Contact />
                    </main>
                </div>
            </MotionConfig>
        </>
    );
}
