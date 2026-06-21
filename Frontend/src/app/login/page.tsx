"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Alert, Button, Card, Field, TextInput } from "@/components/ui";

type Mode = "login" | "register";

export default function LoginPage() {
  const { user, loading: authLoading, login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/studio");
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password, confirm);
      }
      router.replace("/studio");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.firstError() ?? err.message);
      } else {
        setError("Something went wrong. Is the backend running on localhost:8000?");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">AI Image Studio</h1>
          <p className="text-sm text-muted mt-1">Claude engineers the prompt. Gemini paints it.</p>
        </div>

        <Card className="p-6">
          <div className="flex gap-1 p-1 bg-elevated rounded-lg mb-5 text-sm">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-md capitalize transition-colors ${
                  mode === m ? "bg-panel text-white" : "text-muted hover:text-white"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert kind="error">{error}</Alert>}

            {mode === "register" && (
              <Field label="Name" required>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </Field>
            )}

            <Field label="Email" required>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Password" required>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </Field>

            {mode === "register" && (
              <Field label="Confirm password" required>
                <TextInput
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </Field>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted mt-6">
          Demo user: <span className="text-neutral-400">user@example.com / password</span>
        </p>
      </div>
    </div>
  );
}
