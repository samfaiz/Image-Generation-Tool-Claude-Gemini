"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "./ui";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/gallery", label: "Gallery" },
  { href: "/settings", label: "Settings" },
];

/**
 * Layout + auth guard for protected pages. Redirects to /login when there is
 * no authenticated user.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line sticky top-0 z-20 bg-ink/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/studio" className="font-semibold tracking-tight text-neutral-100">
              AI Image Studio
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      active ? "text-white bg-white/5" : "text-muted hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted hidden sm:inline">{user.email}</span>
            <button
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="text-muted hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
