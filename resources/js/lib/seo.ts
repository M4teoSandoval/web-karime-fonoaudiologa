import { services } from '@/data/services';
import { type SiteConfig } from '@/types';

/**
 * Título y descripción de la portada viven en config/site.php (backend) para
 * poder renderizarse también en el HTML inicial. Aquí solo se construyen las
 * URLs absolutas y los datos estructurados.
 */

/** Construye una URL absoluta a partir de la ruta indicada. */
export function absoluteUrl(site: SiteConfig, path = '/'): string {
    const base = site.url.replace(/\/+$/, '');

    return `${base}${path}`;
}

/**
 * Datos estructurados (JSON-LD) de la profesional y de su consultorio.
 *
 * Solo incluye datos verificables: el nombre profesional, la formación
 * publicada en el sitio, el consultorio real, el teléfono de contacto y los
 * servicios efectivamente ofrecidos. No incluye reseñas, precios, horarios
 * ni calificaciones, porque no hay datos reales que los respalden.
 */
export function buildStructuredData(site: SiteConfig): Record<string, unknown> {
    const professional = site.professional;

    const base = site.url.replace(/\/+$/, '');
    const image = `${base}${professional.image}`;

    const address = {
        '@type': 'PostalAddress',
        streetAddress: professional.street_address,
        addressLocality: professional.locality,
        addressRegion: professional.region,
        addressCountry: professional.country,
    };

    const areaServed = {
        '@type': 'City',
        name: professional.locality,
    };

    const offerCatalog = {
        '@type': 'OfferCatalog',
        '@id': `${base}/#servicios`,
        name: 'Servicios de fonoaudiología',
        itemListElement: services.map((service) => ({
            '@type': 'Offer',
            itemOffered: {
                '@type': 'Service',
                name: service.title,
                description: service.shortDescription,
            },
        })),
    };

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Person',
                '@id': `${base}/#karime-sandoval`,
                name: professional.name,
                alternateName: professional.full_name,
                jobTitle: professional.job_title,
                description:
                    'Fonoaudióloga con formación en Fundación Universitaria María Cano (2024) y especialización en Audiología en curso (Escuela Colombiana de Rehabilitación). Acompaña a niños, adolescentes y adultos en procesos de comunicación, habla, lenguaje, voz, deglución y audición.',
                url: `${base}/`,
                image,
                telephone: `+${site.phone}`,
                sameAs: [professional.instagram, site.maps_url],
                alumniOf: {
                    '@type': 'EducationalOrganization',
                    name: 'Fundación Universitaria María Cano',
                },
                address,
                areaServed,
                knowsAbout: services.map((service) => service.title),
                hasOfferCatalog: offerCatalog,
            },
            {
                '@type': 'ProfessionalService',
                '@id': `${base}/#consultorio`,
                name: `${professional.name} · ${professional.job_title}`,
                url: `${base}/`,
                image,
                telephone: `+${site.phone}`,
                founder: { '@id': `${base}/#karime-sandoval` },
                employee: { '@id': `${base}/#karime-sandoval` },
                address,
                areaServed,
                serviceType: ['Fonoaudiología', 'Audiología'],
                hasOfferCatalog: { '@id': `${base}/#servicios` },
                hasMap: site.maps_url,
                sameAs: [professional.instagram, site.maps_url],
            },
        ],
    };
}
