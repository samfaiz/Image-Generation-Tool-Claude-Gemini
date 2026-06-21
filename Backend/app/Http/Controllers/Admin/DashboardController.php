<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Generation;
use App\Models\User;
use Illuminate\Contracts\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $stats = [
            'total_users' => User::count(),
            // Daily Active Users: distinct users seen since midnight (from last_active_at).
            'dau' => User::where('last_active_at', '>=', now()->startOfDay())->count(),
            'wau' => User::where('last_active_at', '>=', now()->subDays(7))->count(),
            'total_generations' => Generation::count(),
            'completed_generations' => Generation::where('status', Generation::STATUS_COMPLETED)->count(),
        ];

        $recentGenerations = Generation::with('user')->latest()->take(8)->get();
        $newUsers = User::latest()->take(5)->get();

        return view('admin.dashboard', compact('stats', 'recentGenerations', 'newUsers'));
    }
}
