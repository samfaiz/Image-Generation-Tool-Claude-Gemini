@extends('admin.layout')

@section('title', 'Dashboard')

@section('content')
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        @php
            $cards = [
                ['Total Users', $stats['total_users']],
                ['Daily Active (DAU)', $stats['dau']],
                ['Weekly Active', $stats['wau']],
                ['Generations', $stats['total_generations']],
            ];
        @endphp
        @foreach ($cards as [$label, $value])
            <div class="bg-panel border border-line rounded-xl p-5">
                <div class="text-xs uppercase tracking-wider text-neutral-500">{{ $label }}</div>
                <div class="text-3xl font-semibold text-neutral-100 mt-2">{{ number_format($value) }}</div>
            </div>
        @endforeach
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-panel border border-line rounded-xl overflow-hidden">
            <div class="px-5 py-3 border-b border-line text-sm font-medium text-neutral-200">Recent generations</div>
            <table class="w-full text-sm">
                <thead class="text-neutral-500 text-xs uppercase tracking-wider">
                    <tr class="border-b border-line">
                        <th class="text-left font-medium px-5 py-2.5">User</th>
                        <th class="text-left font-medium px-5 py-2.5">Idea</th>
                        <th class="text-left font-medium px-5 py-2.5">Status</th>
                        <th class="text-left font-medium px-5 py-2.5">When</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($recentGenerations as $g)
                        <tr class="border-b border-line/60">
                            <td class="px-5 py-3 text-neutral-400">{{ $g->user?->email ?? '—' }}</td>
                            <td class="px-5 py-3 text-neutral-200 max-w-xs truncate">{{ \Illuminate\Support\Str::limit($g->idea, 50) }}</td>
                            <td class="px-5 py-3">
                                <span class="text-xs px-2 py-0.5 rounded-full border
                                    {{ $g->status === 'completed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                       : ($g->status === 'failed' ? 'border-red-500/30 text-red-400 bg-red-500/10'
                                       : 'border-neutral-600 text-neutral-400') }}">
                                    {{ $g->status }}
                                </span>
                            </td>
                            <td class="px-5 py-3 text-neutral-500">{{ $g->created_at->diffForHumans() }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="px-5 py-8 text-center text-neutral-500">No generations yet.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="bg-panel border border-line rounded-xl overflow-hidden">
            <div class="px-5 py-3 border-b border-line text-sm font-medium text-neutral-200">Newest users</div>
            <ul class="divide-y divide-line/60">
                @forelse ($newUsers as $u)
                    <li class="px-5 py-3">
                        <div class="text-neutral-200 text-sm">{{ $u->name }}</div>
                        <div class="text-neutral-500 text-xs">{{ $u->email }} · {{ $u->created_at->diffForHumans() }}</div>
                    </li>
                @empty
                    <li class="px-5 py-8 text-center text-neutral-500 text-sm">No users yet.</li>
                @endforelse
            </ul>
        </div>
    </div>
@endsection
