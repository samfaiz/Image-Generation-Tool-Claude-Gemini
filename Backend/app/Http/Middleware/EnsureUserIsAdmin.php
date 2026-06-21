<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the Blade-based Admin CMS (web guard). Non-admins are bounced to the
 * admin login. Used as the `admin` route middleware alias.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('admin.login');
        }

        if (! $user->isAdmin()) {
            // Authenticated but not an admin (e.g. signed in as an app user in
            // the same browser) — send them to the admin login to switch accounts.
            return redirect()->route('admin.login')->withErrors([
                'email' => 'Admin access required. Sign in with an administrator account.',
            ]);
        }

        return $next($request);
    }
}
