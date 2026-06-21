"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ApiKeyOnboarding } from "@/components/ApiKeyOnboarding";
import { ModelPreferences } from "@/components/ModelPreferences";
import { api, type CredentialStatus } from "@/lib/api";
import { Button, Card, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const [creds, setCreds] = useState<CredentialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCreds(await api.getCredentials());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function clearKeys() {
    if (!confirm("Remove both stored API keys?")) return;
    setClearing(true);
    try {
      await api.clearCredentials();
      await load();
    } finally {
      setClearing(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-neutral-100 mb-1">Settings</h1>
        <p className="text-muted text-sm mb-6">Manage your encrypted AI provider keys.</p>

        {loading ? (
          <div className="flex justify-center py-12 text-muted">
            <Spinner />
          </div>
        ) : (
          <>
            <ApiKeyOnboarding status={creds} onSaved={setCreds} showInfo={false} />

            {creds && <ModelPreferences status={creds} onSaved={setCreds} />}

            {(creds?.has_claude || creds?.has_gemini) && (
              <Card className="p-5 mt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-200">Remove keys</div>
                    <div className="text-xs text-muted">Deletes both encrypted keys from the database.</div>
                  </div>
                  <Button variant="danger" loading={clearing} onClick={clearKeys}>
                    Clear keys
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
