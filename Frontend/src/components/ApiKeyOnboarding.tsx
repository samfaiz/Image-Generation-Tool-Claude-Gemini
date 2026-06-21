"use client";

import { useState } from "react";
import { api, ApiError, type CredentialStatus } from "@/lib/api";
import { Alert, Button, Card, Field, TextInput } from "./ui";

function KeyStatus({ label, has, last4, verified }: { label: string; has: boolean; last4: string | null; verified: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted">{label}</span>
      {has ? (
        <span className="flex items-center gap-2">
          <span className="font-mono text-neutral-300">····{last4}</span>
          {verified ? (
            <span className="text-xs text-success">verified</span>
          ) : (
            <span className="text-xs text-muted">saved</span>
          )}
        </span>
      ) : (
        <span className="text-xs text-danger">not set</span>
      )}
    </div>
  );
}

export function ApiKeyOnboarding({
  status,
  onSaved,
  showInfo = true,
}: {
  status: CredentialStatus | null;
  onSaved: (status: CredentialStatus) => void;
  showInfo?: boolean;
}) {
  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyErrors, setVerifyErrors] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyErrors({});

    if (!claudeKey && !geminiKey) {
      setError("Enter at least one key to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveCredentials({
        claude_key: claudeKey || undefined,
        gemini_key: geminiKey || undefined,
        verify: true,
      });
      setVerifyErrors(res.verify_errors ?? {});
      setClaudeKey("");
      setGeminiKey("");
      onSaved(res.credentials);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError() ?? err.message : "Failed to save keys.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {showInfo && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-neutral-100 mb-2">Why two keys?</h3>
          <p className="text-sm text-muted leading-relaxed">
            <span className="text-neutral-300">Claude</span> acts as your prompt engineer, formatting your ideas into a
            perfect JSON structure. <span className="text-neutral-300">Gemini</span> acts as the artist, generating the
            image from that structure.
          </p>
        </Card>
      )}

      <Card className="p-5">
        {status && (
          <div className="mb-5 pb-5 border-b border-line">
            <KeyStatus label="Anthropic (Claude)" has={status.has_claude} last4={status.claude_last4} verified={status.claude_verified} />
            <KeyStatus label="Google (Gemini)" has={status.has_gemini} last4={status.gemini_last4} verified={status.gemini_verified} />
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}

          <Field
            label="Anthropic (Claude) API key"
            hint={status?.has_claude ? "Leave blank to keep your existing key." : "Starts with sk-ant-…"}
            error={verifyErrors.claude_key}
          >
            <TextInput
              type="password"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
            />
          </Field>

          <Field
            label="Google (Gemini) API key"
            hint={status?.has_gemini ? "Leave blank to keep your existing key." : "From Google AI Studio"}
            error={verifyErrors.gemini_key}
          >
            <TextInput
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
          </Field>

          <div className="flex items-center gap-2 text-xs text-muted">
            <svg className="h-4 w-4 text-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Your API keys are encrypted at rest using AES-256 military-grade encryption.
          </div>

          <Button type="submit" loading={saving}>
            Save keys
          </Button>
        </form>
      </Card>
    </div>
  );
}
