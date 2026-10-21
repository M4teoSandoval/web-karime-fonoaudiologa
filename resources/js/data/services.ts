import { BookOpenText, Ear, Headphones, MessageCircle, Mic2, Orbit, Speech, Utensils, type LucideIcon } from 'lucide-react';

export type ServiceColor = 'sage' | 'pink';

export interface Service {
    title: string;
    shortDescription: string;
    details: string[];
    icon: LucideIcon;
    color: ServiceColor;
}

/**
 * Catálogo de servicios de la página.
 * Los títulos deben mantenerse sincronizados con App\Models\AppointmentRequest::SERVICES.
 */
export const services: Service[] = [
    {
        title: 'Protectores auditivos',
        shortDescription:
            'Protectores auditivos elaborados a la medida de tus oídos para brindar comodidad y protección según tus necesidades. Ideales para diferentes actividades, como exposición al ruido, descanso, contacto con el agua y viajes en avión, según el tipo de protector.',
        details: [
            'Elaborados a la medida de tus oídos.',
            'Comodidad y protección según tus necesidades.',
            'Exposición al ruido.',
            'Descanso, contacto con el agua y viajes en avión, según el tipo de protector.',
        ],
        icon: Headphones,
        color: 'sage',
    },
    {
        title: 'Limpieza de Oídos',
        shortDescription:
            'Procedimiento de higiene y limpieza del conducto auditivo externo para la eliminación de acumulación de cerumen, realizado de manera segura y profesional.',
        details: [],
        icon: Ear,
        color: 'sage',
    },
    {
        title: 'Rehabilitación Vestibular',
        shortDescription:
            'Evaluación e intervención dirigida a personas con alteraciones del equilibrio y síntomas relacionados con el sistema vestibular.',
        details: [
            'Mareos y vértigo.',
            'Inestabilidad y alteraciones del equilibrio.',
            'Dificultades relacionadas con el sistema vestibular.',
            'Ejercicios de rehabilitación vestibular individualizados.',
        ],
        icon: Orbit,
        color: 'pink',
    },
    {
        title: 'Terapia de Voz',
        shortDescription: 'Intervención dirigida a personas que presentan dificultades en la calidad, uso o resistencia de la voz.',
        details: ['Disfonías.', 'Fatiga vocal.', 'Alteraciones de la calidad de la voz.', 'Educación y cuidado de la voz.'],
        icon: Mic2,
        color: 'sage',
    },
    {
        title: 'Terapia de Lenguaje',
        shortDescription: 'Atención dirigida a niños, adolescentes y adultos con dificultades en la comprensión y expresión del lenguaje.',
        details: [
            'Retrasos en la adquisición del lenguaje.',
            'Dificultades para comprender o expresar ideas.',
            'Problemas en vocabulario, estructuración de frases y comunicación.',
            'Alteraciones del lenguaje asociadas a condiciones neurológicas.',
        ],
        icon: MessageCircle,
        color: 'pink',
    },
    {
        title: 'Terapia de Habla',
        shortDescription: 'Intervención para personas que presentan dificultades en la producción y claridad del habla.',
        details: [
            'Dificultades en la articulación de sonidos.',
            'Alteraciones de la fluidez, como disfemia (tartamudez).',
            'Dificultades en la inteligibilidad del habla.',
            'Rehabilitación de alteraciones del habla en adultos.',
        ],
        icon: Speech,
        color: 'sage',
    },
    {
        title: 'Terapia de Deglución',
        shortDescription: 'Evaluación e intervención de dificultades para masticar y tragar alimentos, líquidos o saliva.',
        details: [
            'Dificultades para deglutir.',
            'Alteraciones de la masticación.',
            'Tos o atragantamiento durante las comidas.',
            'Cambios en la alimentación y seguridad al tragar.',
            'Rehabilitación de la deglución en adultos y población pediátrica.',
        ],
        icon: Utensils,
        color: 'pink',
    },
    {
        title: 'Evaluación e Intervención en Lectoescritura',
        shortDescription:
            'Dirigida a niños que presentan dificultades para aprender a leer y escribir, reconocer letras y sonidos, formar palabras, leer con fluidez o comprender textos. A través de la evaluación e intervención fonoaudiológica, fortalecemos las habilidades del lenguaje necesarias para el aprendizaje.',
        details: [
            'Dificultades para aprender a leer y escribir.',
            'Reconocimiento de letras y sonidos.',
            'Formación de palabras y lectura con fluidez.',
            'Comprensión de textos.',
        ],
        icon: BookOpenText,
        color: 'pink',
    },
];

/** Nombres exactos de los servicios, usados en el formulario de agendamiento. */
export const serviceNames: string[] = services.map((service) => service.title);

/**
 * Opción del formulario que permite al paciente escribir un servicio
 * distinto al catálogo oficial. Debe coincidir con
 * App\Models\AppointmentRequest::OTHER_SERVICE.
 */
export const OTHER_SERVICE_OPTION = 'Otro servicio';
