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
    primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-sm",
    ghost: "text-muted hover:text-text hover:bg-elevated",
    outline: "border border-line text-text bg-panel hover:bg-elevated",
    danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/15",
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
      <span className="block text-sm text-text mb-1.5 font-medium">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
}

const inputClasses =
  "w-full bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 transition-colors";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} resize-y ${props.className ?? ""}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel border border-line rounded-xl card-shadow ${className}`}>{children}</div>
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
    info: "bg-accent-soft border-accent/20 text-accent",
  } as const;
  return (
    <div className={`text-sm rounded-lg border px-3.5 py-2.5 ${styles[kind]}`}>{children}</div>
  );
}

/**
 * Small uppercase kicker badge — mirrors the WhatCampaign hero's
 * "● World's First Conversational Ad-Ops Platform" pill.
 */
export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent text-xs font-medium px-3 py-1 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

/** Word-mark logo lockup — the "W" in WhatCampaign style, paired with the app name. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-6 w-6 text-sm" : size === "lg" ? "h-10 w-10 text-xl" : "h-8 w-8 text-base";
  const label = size === "lg" ? "text-xl" : "text-base";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`${dims} grid place-items-center rounded-md bg-accent text-on-accent font-bold tracking-tight`}
        aria-hidden="true"
      >
        W
      </span>
      <span className={`${label} font-semibold tracking-tight text-text`}>AI Studio</span>
    </span>
  );
}
