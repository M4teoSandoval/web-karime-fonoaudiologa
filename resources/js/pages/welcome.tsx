import { Hero } from '@/components/home/hero';
import { Navbar } from '@/components/navigation/navbar';
import { Head } from '@inertiajs/react';
import { Services } from '@/components/home/services';

export default function Welcome() {
    return (
        <>
            <Head title="Karime Sandoval · Fonoaudióloga">
                <link rel="icon" type="image/svg+xml" href="/images/branding/logo-karime-sandoval.png" />
                <link rel="preconnect" href="https://fonts.bunny.net" />

                <link href="https://fonts.bunny.net/css?family=dhyana:400,700" rel="stylesheet" />

                <link href="https://fonts.bunny.net/css?family=dancing-script:400,500,600,700" rel="stylesheet" />
                <link href="https://fonts.bunny.net/css?family=bad-script:400,500,600,700" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-[#fcf9f7]">
                <Navbar />
                <main>
                    <Hero />
                    <Services />
                </main>
            </div>
        </>
    );
}
