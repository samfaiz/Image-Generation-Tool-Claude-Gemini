<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Login · AI Image Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0a0a0b] text-neutral-300 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
            <div class="text-neutral-100 text-lg font-semibold tracking-tight">AI Image Studio</div>
            <div class="text-[11px] uppercase tracking-widest text-neutral-500 mt-1">Admin CMS</div>
        </div>

        <form method="POST" action="{{ route('admin.login.attempt') }}"
              class="bg-[#141416] border border-[#26262b] rounded-xl p-6 space-y-4">
            @csrf

            @if ($errors->any())
                <div class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    {{ $errors->first() }}
                </div>
            @endif

            <div>
                <label class="block text-xs text-neutral-400 mb-1.5">Email</label>
                <input type="email" name="email" value="{{ old('email') }}" required autofocus
                       class="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none">
            </div>

            <div>
                <label class="block text-xs text-neutral-400 mb-1.5">Password</label>
                <input type="password" name="password" required
                       class="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none">
            </div>

            <label class="flex items-center gap-2 text-xs text-neutral-400">
                <input type="checkbox" name="remember" class="rounded border-neutral-700 bg-transparent"> Remember me
            </label>

            <button class="w-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-md py-2.5 transition-colors">
                Sign in
            </button>
        </form>
    </div>
</body>
</html>
