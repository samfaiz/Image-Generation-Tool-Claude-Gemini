<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Admin') · AI Image Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { theme: { extend: { colors: { ink: '#0a0a0b', panel: '#141416', line: '#26262b', accent: '#6366f1' } } } }
    </script>
</head>
<body class="bg-ink text-neutral-300 antialiased min-h-screen">
    <div class="flex min-h-screen">
        <aside class="w-60 shrink-0 border-r border-line bg-panel/40 p-5 flex flex-col">
            <div class="text-neutral-100 font-semibold tracking-tight mb-8">
                AI Image Studio
                <div class="text-[11px] uppercase tracking-widest text-neutral-500 mt-1">Admin CMS</div>
            </div>
            <nav class="space-y-1 text-sm">
                <a href="{{ route('admin.dashboard') }}"
                   class="block rounded-md px-3 py-2 {{ request()->routeIs('admin.dashboard') ? 'bg-accent/15 text-white' : 'hover:bg-white/5' }}">Dashboard</a>
                <a href="{{ route('admin.users.index') }}"
                   class="block rounded-md px-3 py-2 {{ request()->routeIs('admin.users.*') ? 'bg-accent/15 text-white' : 'hover:bg-white/5' }}">Users</a>
            </nav>
            <form method="POST" action="{{ route('admin.logout') }}" class="mt-auto pt-6">
                @csrf
                <div class="text-xs text-neutral-500 mb-2">{{ auth()->user()?->email }}</div>
                <button class="w-full text-left text-sm rounded-md px-3 py-2 text-neutral-400 hover:bg-white/5 hover:text-white">Sign out</button>
            </form>
        </aside>

        <main class="flex-1 p-8">
            <h1 class="text-2xl font-semibold text-neutral-100 mb-6">@yield('title')</h1>
            @yield('content')
        </main>
    </div>
</body>
</html>
