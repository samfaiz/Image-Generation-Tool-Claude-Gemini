@extends('admin.layout')

@section('title', 'Users')

@section('content')
    @if (session('reset_result'))
        @php($r = session('reset_result'))
        <div class="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm">
            <div class="text-emerald-300 font-medium mb-1">Temporary password generated for {{ $r['user'] }}</div>
            <div class="text-neutral-300">Share this with the user — they should change it after signing in:</div>
            <code class="inline-block mt-2 bg-black/40 border border-line rounded px-3 py-1.5 text-emerald-200 font-mono">{{ $r['password'] }}</code>
        </div>
    @endif

    <div class="bg-panel border border-line rounded-xl overflow-hidden">
        <table class="w-full text-sm">
            <thead class="text-neutral-500 text-xs uppercase tracking-wider">
                <tr class="border-b border-line">
                    <th class="text-left font-medium px-5 py-3">Name</th>
                    <th class="text-left font-medium px-5 py-3">Email</th>
                    <th class="text-left font-medium px-5 py-3">Role</th>
                    <th class="text-left font-medium px-5 py-3">Generations</th>
                    <th class="text-left font-medium px-5 py-3">Last active</th>
                    <th class="text-right font-medium px-5 py-3">Actions</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($users as $user)
                    <tr class="border-b border-line/60">
                        <td class="px-5 py-3 text-neutral-200">{{ $user->name }}</td>
                        <td class="px-5 py-3 text-neutral-400">{{ $user->email }}</td>
                        <td class="px-5 py-3">
                            @if ($user->is_admin)
                                <span class="text-xs px-2 py-0.5 rounded-full border border-indigo-500/30 text-indigo-300 bg-indigo-500/10">admin</span>
                            @else
                                <span class="text-xs text-neutral-500">user</span>
                            @endif
                        </td>
                        <td class="px-5 py-3 text-neutral-400">{{ $user->generations_count }}</td>
                        <td class="px-5 py-3 text-neutral-500">{{ $user->last_active_at?->diffForHumans() ?? 'never' }}</td>
                        <td class="px-5 py-3 text-right">
                            <form method="POST" action="{{ route('admin.users.reset', $user) }}"
                                  onsubmit="return confirm('Generate a temporary password for {{ $user->email }}?')">
                                @csrf
                                <button class="text-xs px-3 py-1.5 rounded-md border border-line text-neutral-300 hover:bg-white/5 hover:text-white transition-colors">
                                    Reset password
                                </button>
                            </form>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="mt-4">{{ $users->links() }}</div>
@endsection
