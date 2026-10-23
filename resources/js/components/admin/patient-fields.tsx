import InputError from '@/components/input-error';
import { type PatientSummary } from '@/types';
import { Check, LoaderCircle, Search, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type PatientMode = 'existing' | 'new';

interface PatientFieldsProps {
    mode: PatientMode;
    onModeChange: (mode: PatientMode) => void;

    selected: PatientSummary | null;
    onSelect: (patient: PatientSummary | null) => void;

    name: string;
    onNameChange: (value: string) => void;
    phone: string;
    onPhoneChange: (value: string) => void;

    allowDuplicatePhone: boolean;
    onAllowDuplicatePhoneChange: (value: boolean) => void;

    errors?: {
        patient_id?: string;
        patient_name?: string;
        patient_phone?: string;
        allow_duplicate_phone?: string;
    };
}

/**
 * Selección de paciente para citas manuales y para vincular solicitudes.
 * Permite buscar un registro existente o crear uno nuevo. Nunca fusiona
 * automáticamente: las coincidencias las decide Karime.
 */
export default function PatientFields({
    mode,
    onModeChange,
    selected,
    onSelect,
    name,
    onNameChange,
    phone,
    onPhoneChange,
    allowDuplicatePhone,
    onAllowDuplicatePhoneChange,
    errors = {},
}: PatientFieldsProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientSummary[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchFailed, setSearchFailed] = useState(false);

    useEffect(() => {
        if (mode !== 'existing') {
            return undefined;
        }

        const term = query.trim();

        if (term.length < 2) {
            setResults([]);
            setSearching(false);
            setSearchFailed(false);

            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setSearching(true);
            setSearchFailed(false);

            try {
                const response = await fetch(`${route('admin.patients.search')}?q=${encodeURIComponent(term)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('search failed');
                }

                const json = (await response.json()) as { patients: PatientSummary[] };
                setResults(json.patients);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setSearchFailed(true);
                }
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [mode, query]);

    return (
        <div className="space-y-3">
            <div className="inline-flex rounded-full border border-[#eadedf] bg-white p-1" role="group" aria-label="Tipo de paciente">
                <button
                    type="button"
                    onClick={() => onModeChange('existing')}
                    aria-pressed={mode === 'existing'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        mode === 'existing' ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:text-[#373432]'
                    }`}
                >
                    <Search className="size-3.5" />
                    Paciente existente
                </button>

                <button
                    type="button"
                    onClick={() => onModeChange('new')}
                    aria-pressed={mode === 'new'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        mode === 'new' ? 'bg-[#7d8f7a] text-white' : 'text-[#706a67] hover:text-[#373432]'
                    }`}
                >
                    <UserPlus className="size-3.5" />
                    Paciente nuevo
                </button>
            </div>

            {mode === 'existing' ? (
                <div className="space-y-2">
                    {selected ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#7d8f7a]/40 bg-[#7d8f7a]/8 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#373432]">{selected.name}</p>
                                <p className="text-xs text-[#706a67]">{selected.phone ?? 'Sin teléfono registrado'}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    onSelect(null);
                                    setQuery('');
                                }}
                                className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#706a67] hover:text-[#c98796]"
                            >
                                <X className="size-3.5" />
                                Cambiar
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#b3aaa6]" />

                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Buscar por nombre o teléfono"
                                    aria-label="Buscar paciente"
                                    className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white pr-3 pl-9 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                                />
                            </div>

                            {searching && (
                                <p className="inline-flex items-center gap-2 text-xs text-[#706a67]">
                                    <LoaderCircle className="size-3.5 animate-spin" />
                                    Buscando pacientes…
                                </p>
                            )}

                            {searchFailed && <p className="text-xs font-semibold text-[#a14444]">No fue posible buscar. Intenta de nuevo.</p>}

                            {!searching && !searchFailed && query.trim().length >= 2 && results.length === 0 && (
                                <p className="text-xs text-[#706a67]">
                                    No hay coincidencias. Cambia a “Paciente nuevo” para crear el registro.
                                </p>
                            )}

                            {results.length > 0 && (
                                <ul className="max-h-48 divide-y divide-[#eadedf] overflow-y-auto rounded-xl border border-[#eadedf] bg-white">
                                    {results.map((patient) => (
                                        <li key={patient.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onSelect(patient);
                                                    setResults([]);
                                                }}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fcf9f7]"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-[#373432]">{patient.name}</span>
                                                    <span className="block text-xs text-[#706a67]">{patient.phone ?? 'Sin teléfono'}</span>
                                                </span>

                                                <Check className="size-4 shrink-0 text-[#7d8f7a]" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}

                    <InputError message={errors.patient_id} />
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="patient-name" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                            Nombre completo
                        </label>

                        <input
                            id="patient-name"
                            type="text"
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            autoComplete="name"
                            placeholder="Nombre y apellido"
                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                        />

                        <InputError message={errors.patient_name} />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="patient-phone" className="text-xs font-bold tracking-wide text-[#7d8f7a] uppercase">
                            Teléfono
                        </label>

                        <input
                            id="patient-phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => onPhoneChange(event.target.value)}
                            autoComplete="tel"
                            placeholder="300 000 0000"
                            className="h-11 w-full rounded-xl border border-[#ded4d4] bg-white px-3 text-sm text-[#373432] placeholder:text-[#b3aaa6] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none"
                        />

                        <InputError message={errors.patient_phone} />
                    </div>

                    <label className="flex items-start gap-2.5 text-xs leading-5 text-[#706a67] sm:col-span-2">
                        <input
                            type="checkbox"
                            checked={allowDuplicatePhone}
                            onChange={(event) => onAllowDuplicatePhoneChange(event.target.checked)}
                            className="mt-0.5 size-4 rounded border-[#ded4d4] text-[#7d8f7a] focus:ring-[#7d8f7a]"
                        />
                        <span>Permitir este teléfono aunque ya exista en otro paciente (por ejemplo, familiares que comparten número).</span>
                    </label>

                    <InputError message={errors.allow_duplicate_phone} />
                </div>
            )}
        </div>
    );
}
