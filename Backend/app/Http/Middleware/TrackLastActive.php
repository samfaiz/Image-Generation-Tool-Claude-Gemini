<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stamps the authenticated user's `last_active_at` at most once per hour.
 * This powers the admin dashboard's Daily Active Users (DAU) metric.
 */
class TrackLastActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (! $user->last_active_at || $user->last_active_at->lt(now()->subHour()))) {
            $user->forceFill(['last_active_at' => Carbon::now()])->saveQuietly();
        }

        return $next($request);
    }
}
