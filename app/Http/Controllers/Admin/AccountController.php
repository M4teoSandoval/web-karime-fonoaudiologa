<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAccountPasswordRequest;
use App\Http\Requests\Admin\UpdateAccountRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/account');
    }

    public function update(UpdateAccountRequest $request): RedirectResponse
    {
        $request->user()->update($request->validated());

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Tus datos se actualizaron correctamente.',
        ]);
    }

    public function updatePassword(UpdateAccountPasswordRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->validated('password'),
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Tu contraseña se actualizó correctamente.',
        ]);
    }
}
