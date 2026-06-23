"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Logo, Spinner } from "./ui";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/gallery", label: "Gallery" },
  { href: "/settings", label: "Settings" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="h-9 w-9 grid place-items-center rounded-lg border border-line text-muted hover:text-text hover:bg-elevated transition-colors"
    >
      {isDark ? (
        // Sun (we're currently dark → button switches to light)
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon (we're currently light → button switches to dark)
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

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
    <div className="min-h-screen flex flex-col bg-ink">
      <header className="border-b border-line sticky top-0 z-20 bg-ink/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-10">
            <Link href="/studio" aria-label="AI Studio home">
              <Logo />
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-md transition-colors font-medium ${
                      active ? "text-text bg-elevated" : "text-muted hover:text-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted hidden lg:inline">{user.email}</span>
            <ThemeToggle />
            <button
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="text-muted hover:text-text transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
