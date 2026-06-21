"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    ghost: "text-muted hover:text-white hover:bg-white/5",
    outline: "border border-line text-neutral-200 hover:bg-white/5",
    danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  } as const;

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-300 mb-1.5">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
}

const inputClasses =
  "w-full bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-muted focus:border-accent focus:outline-none transition-colors";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} resize-y ${props.className ?? ""}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel border border-line rounded-xl ${className}`}>{children}</div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-danger/10 border-danger/30 text-danger",
    success: "bg-success/10 border-success/30 text-success",
    info: "bg-accent/10 border-accent/30 text-accent-hover",
  } as const;
  return (
    <div className={`text-sm rounded-lg border px-3.5 py-2.5 ${styles[kind]}`}>{children}</div>
  );
}
