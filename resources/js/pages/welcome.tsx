import { Hero } from '@/components/home/hero';
import { Navbar } from '@/components/navigation/navbar';
import { Head } from '@inertiajs/react';
import { MotionConfig } from 'framer-motion';
import { Services } from '@/components/home/services';
import {About} from '@/components/home/about';
import { Booking } from '@/components/home/booking';
import { Contact } from '@/components/home/contact';
export default function Welcome() {
    return (
        <>
            <Head title="Karime Sandoval · Fonoaudióloga">
                <link rel="icon" type="image/svg+xml" href="/images/branding/logo-karime-sandoval.png" />
            </Head>

            {/* reducedMotion="user": respeta prefers-reduced-motion del dispositivo sin desactivar animaciones para el resto. */}
            <MotionConfig reducedMotion="user">
                <div className="min-h-screen bg-[#fcf9f7]">
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
