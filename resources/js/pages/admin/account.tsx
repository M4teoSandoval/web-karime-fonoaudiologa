import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { type SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { KeyRound, LoaderCircle, Save, UserRound } from 'lucide-react';
import { type ComponentProps, type FormEvent, useRef } from 'react';

interface AccountFieldProps extends ComponentProps<'input'> {
    id: string;
    label: string;
    error?: string;
}

function AccountField({ id, label, error, ...inputProps }: AccountFieldProps) {
    return (
        <div className="min-w-0 space-y-1.5">
            <label htmlFor={id} className="text-sm font-semibold text-[#373432]">
                {label}
            </label>

            <input
                id={id}
                aria-invalid={error ? true : undefined}
                className="h-11 w-full min-w-0 rounded-xl border border-[#ded4d4] bg-[#fcfaf9] px-3 text-base text-[#373432] focus:border-[#d99aa8] focus:ring-1 focus:ring-[#d99aa8] focus:outline-none sm:text-sm"
                {...inputProps}
            />

            <InputError message={error} />
        </div>
    );
}

function SubmitButton({ processing, children }: { processing: boolean; children: string }) {
    return (
        <Button type="submit" disabled={processing} className="rounded-full bg-[#7d8f7a] px-6 text-sm font-bold text-white hover:bg-[#6f826c]">
            {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {children}
        </Button>
    );
}

export default function Account() {
    const { auth } = usePage<SharedData>().props;

    const profileForm = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const newPasswordInput = useRef<HTMLInputElement>(null);

    const handleProfile = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        profileForm.patch(route('admin.account.update'), { preserveScroll: true });
    };

    const handlePassword = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        passwordForm.put(route('admin.account.password'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
            onError: (errors) => {
                if (errors.current_password) {
                    passwordForm.reset('current_password');
                    currentPasswordInput.current?.focus();

                    return;
                }

                if (errors.password) {
                    passwordForm.reset('password', 'password_confirmation');
                    newPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AdminLayout title="Mi cuenta">
            <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
                {/* =================================================
                    PROFILE
                ================================================= */}
                <section className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-4 sm:p-6" aria-labelledby="profile-heading">
                    <div className="flex items-center gap-3">
                        <UserRound className="size-5 text-[#7d8f7a]" />

                        <h2 id="profile-heading" className="text-lg font-semibold text-[#373432]">
                            Datos de acceso
                        </h2>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-[#706a67]">
                        Con este correo inicias sesión y recibes el enlace si olvidas la contraseña.
                    </p>

                    <form onSubmit={handleProfile} className="mt-6 space-y-4">
                        <AccountField
                            id="name"
                            label="Nombre"
                            required
                            autoComplete="name"
                            value={profileForm.data.name}
                            onChange={(event) => profileForm.setData('name', event.target.value)}
                            error={profileForm.errors.name}
                        />

                        <AccountField
                            id="email"
                            label="Correo electrónico"
                            type="email"
                            required
                            autoComplete="username"
                            value={profileForm.data.email}
                            onChange={(event) => profileForm.setData('email', event.target.value)}
                            error={profileForm.errors.email}
                        />

                        <div className="pt-2">
                            <SubmitButton processing={profileForm.processing}>Guardar datos</SubmitButton>
                        </div>
                    </form>
                </section>

                {/* =================================================
                    PASSWORD
                ================================================= */}
                <section className="min-w-0 rounded-2xl border border-[#eadedf] bg-white p-4 sm:p-6" aria-labelledby="password-heading">
                    <div className="flex items-center gap-3">
                        <KeyRound className="size-5 text-[#7d8f7a]" />

                        <h2 id="password-heading" className="text-lg font-semibold text-[#373432]">
                            Cambiar contraseña
                        </h2>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-[#706a67]">Usa al menos 8 caracteres y evita repetir contraseñas de otros servicios.</p>

                    <form onSubmit={handlePassword} className="mt-6 space-y-4">
                        <AccountField
                            id="current_password"
                            label="Contraseña actual"
                            type="password"
                            required
                            autoComplete="current-password"
                            ref={currentPasswordInput}
                            value={passwordForm.data.current_password}
                            onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                            error={passwordForm.errors.current_password}
                        />

                        <AccountField
                            id="password"
                            label="Nueva contraseña"
                            type="password"
                            required
                            autoComplete="new-password"
                            ref={newPasswordInput}
                            value={passwordForm.data.password}
                            onChange={(event) => passwordForm.setData('password', event.target.value)}
                            error={passwordForm.errors.password}
                        />

                        <AccountField
                            id="password_confirmation"
                            label="Confirmar nueva contraseña"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={passwordForm.data.password_confirmation}
                            onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)}
                            error={passwordForm.errors.password_confirmation}
                        />

                        <div className="pt-2">
                            <SubmitButton processing={passwordForm.processing}>Actualizar contraseña</SubmitButton>
                        </div>
                    </form>
                </section>
            </div>
        </AdminLayout>
    );
}
