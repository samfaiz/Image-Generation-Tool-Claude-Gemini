<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(): View
    {
        $users = User::withCount('generations')
            ->latest()
            ->paginate(15);

        return view('admin.users.index', compact('users'));
    }

    /**
     * Manually trigger a password reset for a specific user.
     *
     * Local-dev friendly: generates a secure temporary password, sets it, and
     * flashes it back to the admin to communicate to the user. (In production
     * you'd swap this for Password::sendResetLink once mail is configured.)
     */
    public function resetPassword(User $user): RedirectResponse
    {
        $temporary = Str::password(12);

        $user->forceFill(['password' => $temporary])->save();

        return back()->with('reset_result', [
            'user' => $user->email,
            'password' => $temporary,
        ]);
    }
}
