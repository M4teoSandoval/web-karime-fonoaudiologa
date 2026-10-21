import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;

export function useIsMobile() {
    /*
        Se inicializa de forma sincrona (matchMedia) para que el primer
        render ya conozca el viewport. Antes empezaba en `false` y las
        animaciones mobile-only se activaban durante un frame.
    */
    const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

        const onChange = () => {
            setIsMobile(getIsMobile());
        };

        mql.addEventListener('change', onChange);
        setIsMobile(getIsMobile());

        return () => mql.removeEventListener('change', onChange);
    }, []);

    return isMobile;
}
