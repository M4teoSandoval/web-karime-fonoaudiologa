# KARIME SANDOVAL — FONOAUDIÓLOGA & AUDIÓLOGA

## 1. CONTEXTO DEL PROYECTO

Este proyecto es un sitio web profesional para Karime Sandoval,
fonoaudióloga y audióloga.

No se trata de una página ficticia ni de una landing page genérica.
El proyecto está pensado para un entorno real de atención profesional.

La aplicación tendrá dos grandes áreas:

1. Sitio web público para pacientes y visitantes.
2. Panel privado para la gestión de la profesional.

La prioridad actual es construir primero una HOME PAGE visualmente
excelente, profesional, diferente y completamente responsive.

---

# 2. STACK TECNOLÓGICO

## Backend

- Laravel 12
- PHP 8.2+

## Frontend

- React 19
- TypeScript
- Inertia.js

## Estilos

- Tailwind CSS 4
- shadcn/ui
- Radix UI

## Animaciones

- Framer Motion

## Iconos

- Lucide React

## Formularios

- React Hook Form
- Zod

## Base de datos

- PostgreSQL en producción
- SQLite puede utilizarse durante desarrollo inicial

## Deployment

- Railway

No crear una API REST separada.

Laravel + Inertia + React estarán dentro del mismo proyecto.

---

# 3. ARQUITECTURA

No crear carpetas separadas llamadas:

frontend/
backend/

Todo pertenece al mismo proyecto Laravel.

La estructura principal será:

resources/
└── js/
    ├── components/
    ├── layouts/
    ├── pages/
    ├── hooks/
    ├── lib/
    ├── types/
    └── utils/

Laravel será responsable del backend, routing, autenticación,
base de datos y lógica de negocio.

React será responsable de la interfaz.

Inertia será el puente entre Laravel y React.

---

# 4. PRIORIDAD ACTUAL

NO comenzar todavía con:

- Historia clínica
- Pacientes
- Calendario administrativo
- PostgreSQL
- Panel administrativo
- Sistema completo de autenticación
- Deployment

Primero construir una HOME PAGE de altísima calidad visual.

La Home debe sentirse como un sitio web profesional real,
no como una plantilla generada automáticamente.

---

# 5. PRINCIPIOS DE DISEÑO

La página debe transmitir:

- Profesionalismo
- Cercanía
- Confianza
- Tranquilidad
- Elegancia
- Atención personalizada
- Calidad
- Modernidad

Evitar completamente la apariencia de una plantilla médica genérica.

NO abusar de:

- Gradientes
- Glassmorphism
- Blobs
- Sombras fuertes
- Animaciones excesivas
- Tarjetas idénticas
- Iconos decorativos sin propósito
- Elementos flotantes innecesarios
- Diseños que parezcan generados por IA

El diseño debe sentirse humano, editorial y cuidadosamente diseñado.

---

# 6. IDENTIDAD VISUAL

La identidad visual debe partir del logo y del material de branding
proporcionado para Karime Sandoval.

IMPORTANTE:

El volante/material de referencia NO debe copiarse literalmente.

Solo debe utilizarse como referencia para:

- Logo
- Paleta de colores
- Identidad visual
- Sensación de marca

El sitio web debe tener un diseño propio.

---

# 7. TIPOGRAFÍA

## Nombre "Karime Sandoval"

El texto:

"Karime Sandoval"

cuando aparezca como nombre de marca junto al logo en el Navbar,
debe utilizar:

Dancing Script

Debe sentirse elegante, personal y distintivo.

No utilizar Dancing Script para textos largos.

---

## Tipografía general

Todo el resto del sitio debe utilizar:

Dhyana

Dhyana debe utilizarse para:

- Títulos
- Subtítulos
- Párrafos
- Botones
- Navegación
- Formularios
- Cards
- FAQ
- Footer

La jerarquía tipográfica debe ser clara mediante:

- Tamaño
- Peso
- Espaciado
- Altura de línea

No utilizar múltiples familias tipográficas innecesariamente.

---

# 8. NAVBAR

El Navbar debe ser elegante, limpio y responsive.

Debe contener:

- Logo
- Texto "Karime Sandoval" utilizando Dancing Script
- Navegación
- CTA "Agendar cita"

En desktop:

Logo + nombre a la izquierda.

Navegación centrada o equilibrada.

CTA a la derecha.

En mobile:

Logo + nombre a la izquierda.

Menú hamburguesa a la derecha.

El menú mobile debe utilizar una interacción suave.

Utilizar Framer Motion cuando aporte valor.

---

# 9. HOME PAGE

La Home debe construirse progresivamente.

Orden recomendado:

1. Navbar
2. Hero
3. Elementos de confianza
4. Servicios
5. Conoce a Karime
6. Cómo funciona una consulta
7. Agenda tu cita
8. Testimonios
9. FAQ
10. Ubicación
11. Footer

No crear todas las secciones de una sola vez.

Primero construir y perfeccionar:

Navbar
+
Hero

Después continuar con Servicios.

---

# 10. HERO

El Hero es una de las partes más importantes de todo el sitio.

Debe generar una primera impresión premium.

No utilizar el típico:

"Bienvenido a nuestra clínica"

Debe tener una propuesta de valor clara y emocional.

Ejemplo conceptual:

"Comunicación que transforma vidas."

Este texto es una referencia conceptual y puede mejorarse
si se encuentra una alternativa más apropiada.

El Hero puede incorporar una fotografía profesional de Karime.

La fotografía debe sentirse editorial y profesional.

No utilizar una fotografía con aspecto de stock genérico si
existe una fotografía profesional de Karime disponible.

---

# 11. SERVICIOS

Los servicios deben mostrarse de forma visual y fácil de entender.

Entre los servicios pueden contemplarse las áreas reales que
ofrezca la profesional.

No inventar servicios médicos.

Si no existe información suficiente sobre un servicio,
dejar un placeholder claramente identificable o solicitar
la información antes de inventarla.

Las tarjetas de servicios deben tener:

- Icono
- Nombre
- Descripción breve
- CTA cuando sea necesario

Evitar una cuadrícula genérica de tarjetas idénticas.

---

# 12. CONOCE A KARIME

Debe existir una sección dedicada a presentar a la profesional.

Debe transmitir:

- Experiencia
- Cercanía
- Profesionalismo
- Humanidad

Puede incluir:

- Fotografía
- Nombre
- Profesión
- Descripción
- Formación
- Áreas de trabajo

No inventar títulos, especializaciones o experiencia.

Utilizar únicamente información proporcionada por el cliente.

---

# 13. AGENDA

Debe existir un CTA claro para:

"Agendar cita"

Inicialmente puede ser una interfaz visual.

Posteriormente se conectará con el sistema real de reservas.

El objetivo final será permitir:

- Seleccionar servicio
- Seleccionar fecha
- Seleccionar hora
- Registrar datos del paciente
- Confirmar cita

---

# 14. TESTIMONIOS

Debe existir una sección de opiniones.

Visualmente debe sentirse auténtica y elegante.

No inventar testimonios reales.

Durante el desarrollo utilizar datos claramente marcados
como contenido de demostración.

---

# 15. FAQ

Crear una sección de preguntas frecuentes utilizando
Accordion de shadcn/ui cuando sea apropiado.

Las preguntas deben estar relacionadas con los servicios
y el proceso de atención.

No inventar información clínica.

--- 

# 16. UBICACIÓN

Debe existir una sección con:

- Dirección
- Mapa
- Información de contacto
- Botón para obtener indicaciones

La dirección real debe ser proporcionada por el cliente.

No inventar una dirección.

---

# 17. FOOTER

Debe contener:

- Logo
- Nombre
- Información de contacto
- Redes sociales
- Ubicación
- CTA de contacto
- Copyright

Debe ser visualmente consistente con el resto del sitio.

---

# 18. RESPONSIVE DESIGN

MOBILE FIRST.

La mayoría de usuarios accederán desde teléfonos.

Diseñar primero pensando en:

390px

Después adaptar a:

768px

1024px

1280px

1440px

No simplemente escalar el diseño desktop hacia mobile.

El mobile debe ser una experiencia diseñada específicamente.

---

# 19. ANIMACIONES

Utilizar Framer Motion únicamente cuando aporte valor.

Las animaciones deben ser:

- Suaves
- Cortas
- Elegantes
- Naturales

Ejemplos:

- Fade in
- Slide up
- Stagger
- Hover suave
- Reveal al hacer scroll

No animar absolutamente todos los elementos.

La página debe sentirse fluida, no como una demostración
de animaciones.

---

# 20. COMPONENTES

Crear componentes reutilizables.

Ejemplos:

components/
├── ui/
├── layout/
├── navigation/
├── home/
├── services/
└── common/

No duplicar código innecesariamente.

Si un componente puede reutilizarse, convertirlo en componente.

---

# 21. CALIDAD DEL CÓDIGO

Utilizar TypeScript correctamente.

Evitar:

any

cuando exista una alternativa tipada razonable.

Mantener componentes pequeños y legibles.

Separar:

- UI
- Datos
- Tipos
- Lógica
- Utilidades

No colocar toda la Home en un único componente gigantesco.

---

# 22. ACCESIBILIDAD

La aplicación debe tener:

- HTML semántico
- Labels correctos
- Alt text en imágenes
- Navegación por teclado
- Buen contraste
- Estados focus
- Botones correctamente identificados

No utilizar elementos div como botones cuando pueda utilizarse
un botón real.

---

# 23. SEO

La Home debe prepararse para posicionamiento en Google.

Posteriormente se configurará:

- Title
- Meta description
- Open Graph
- Canonical
- Sitemap
- robots.txt
- Schema.org cuando corresponda

El proyecto será registrado posteriormente en Google Search Console.

No hacer SEO spam ni keyword stuffing.

---

# 24. REGLA IMPORTANTE SOBRE DISEÑO

No asumir que "más elementos = mejor diseño".

El espacio vacío es parte del diseño.

Priorizar:

- Composición
- Jerarquía
- Tipografía
- Espaciado
- Fotografía
- Color
- Ritmo visual

El sitio debe verse premium incluso si se eliminan elementos
decorativos.

---

# 25. REGLA IMPORTANTE SOBRE CONTENIDO

No inventar información profesional de Karime.

No inventar:

- Estudios
- Especializaciones
- Años de experiencia
- Servicios
- Testimonios reales
- Dirección
- Horarios
- Número de teléfono
- Redes sociales

Cuando falte información, utilizar placeholders claramente
marcados como:

[POR DEFINIR]

---

# 26. FLUJO DE DESARROLLO

Trabajar por etapas.

ETAPA 1:

Navbar
Hero

ETAPA 2:

Servicios

ETAPA 3:

Conoce a Karime

ETAPA 4:

Proceso de consulta

ETAPA 5:

Agenda

ETAPA 6:

Testimonios

ETAPA 7:

FAQ

ETAPA 8:

Ubicación

ETAPA 9:

Footer

Después:

Panel administrativo.

Después:

Pacientes.

Después:

Historia clínica.

Después:

Agenda real.

Después:

PostgreSQL.

Después:

Deployment en Railway.

---

# 27. NO HACER

No:

- Crear una API separada
- Crear otro frontend
- Crear otro backend
- Instalar librerías innecesarias
- Cambiar Laravel por otro framework
- Reescribir la arquitectura existente
- Eliminar configuraciones existentes sin razón
- Sobrescribir componentes existentes sin revisar su uso
- Inventar contenido médico

---

# 28. OBJETIVO FINAL

El resultado debe parecer un sitio web profesional creado
específicamente para una fonoaudióloga.

No debe parecer:

- Template
- Dashboard genérico
- Landing de IA
- Página médica genérica

Debe sentirse:

elegante
humano
moderno
profesional
cercano
confiable

La experiencia móvil tiene prioridad.