"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type CredentialStatus, type ModelCatalog } from "@/lib/api";
import { Card, Field, Spinner } from "./ui";

function ModelSelect({
  label,
  hint,
  options,
  value,
  saving,
  onChange,
}: {
  label: string;
  hint: string;
  options: string[];
  value: string;
  saving: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <select
          value={value}
          disabled={saving}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-elevated border border-line rounded-lg px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-none disabled:opacity-50"
        >
          <option value="" className="bg-panel">
            Auto (latest available)
          </option>
          {options.map((m) => (
            <option key={m} value={m} className="bg-panel">
              {m}
            </option>
          ))}
        </select>
        {saving && <Spinner className="h-4 w-4 text-muted" />}
      </div>
    </Field>
  );
}

export function ModelPreferences({
  status,
  onSaved,
}: {
  status: CredentialStatus;
  onSaved: (status: CredentialStatus) => void;
}) {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<"imagen" | "flash" | null>(null);

  const load = useCallback(async () => {
    if (!status.has_gemini) {
      setLoading(false);
      return;
    }
    try {
      setCatalog(await api.getModels());
    } finally {
      setLoading(false);
    }
  }, [status.has_gemini]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(field: "imagen" | "flash", value: string) {
    setSavingField(field);
    try {
      const payload =
        field === "imagen" ? { imagen_model: value || null } : { flash_model: value || null };
      const res = await api.saveCredentials(payload);
      onSaved(res.credentials);
    } finally {
      setSavingField(null);
    }
  }

  if (!status.has_gemini) return null;

  return (
    <Card className="p-5 mt-5">
      <h3 className="text-sm font-medium text-text mb-1">Image models</h3>
      <p className="text-xs text-muted mb-4">
        Choose which Gemini models to use, or leave on <span className="text-text/85">Auto</span> to
        always pick the newest available — new Google models appear here automatically.
      </p>

      {loading ? (
        <div className="flex justify-center py-6 text-muted">
          <Spinner />
        </div>
      ) : !catalog || (catalog.predict.length === 0 && catalog.generate.length === 0) ? (
        <p className="text-xs text-muted">
          Couldn&apos;t load your model list. Make sure your Gemini key is valid, then reopen Settings.
        </p>
      ) : (
        <div className="space-y-4">
          <ModelSelect
            label="Imagen model"
            hint="Used when no reference image is uploaded (strict aspect ratio)."
            options={catalog.predict}
            value={status.imagen_model ?? ""}
            saving={savingField === "imagen"}
            onChange={(v) => save("imagen", v)}
          />
          <ModelSelect
            label="Gemini image model"
            hint="Used when a reference image is uploaded (conditioning)."
            options={catalog.generate}
            value={status.flash_model ?? ""}
            saving={savingField === "flash"}
            onChange={(v) => save("flash", v)}
          />
        </div>
      )}
    </Card>
  );
}
