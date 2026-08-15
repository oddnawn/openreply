"use client";

/**
 * Rename the workspace.
 *
 * Self-contained — it loads its own state from /api/workspace rather than
 * threading props through the settings page, because the permission check
 * (owner/admin only) belongs next to the field it governs.
 *
 * Renaming exists because a workspace is named after whoever created it. Anyone
 * who joined by invitation, or who later left that team, was left staring at a
 * stranger's name in the sidebar with no way to change it.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkspaceNameForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("");
  const [canRename, setCanRename] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body.success) return;
        setName(body.data.name);
        setInitial(body.data.name);
        setCanRename(body.data.canRename);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();

      if (!body.success) {
        setError(body.error ?? "Could not save");
        return;
      }

      setInitial(body.data.name);
      setSaved(true);
      // The sidebar renders the name from a server component, so it only
      // updates once the route's data is refetched.
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-10 rounded bg-surface-hover" />;

  return (
    <form onSubmit={save} className="space-y-3">
      <label htmlFor="workspace-name" className="block text-sm text-muted">
        Shown in the sidebar and to anyone you invite.
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="workspace-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          disabled={!canRename}
          maxLength={60}
          className="flex-1 rounded border border-border px-3 py-2 text-sm disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canRename || saving || !name.trim() || name === initial}
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {!canRename && (
        <p className="text-xs text-muted">
          Only an owner or admin can rename the workspace.
        </p>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
      {saved && <p className="text-xs text-accent">Saved.</p>}
    </form>
  );
}
