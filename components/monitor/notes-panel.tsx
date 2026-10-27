"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Select, sendJson } from "@/components/ui/form";

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

/** Private lecturer notes on the team or one member. */
export function NotesPanel({
  teamId,
  members,
  notes,
}: {
  teamId: string;
  members: { id: string; name: string }[];
  notes: { id: string; body: string; membershipId: string | null; author: string; at: string }[];
}) {
  const router = useRouter();
  const [about, setAbout] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const name = (id: string | null) => (id ? (members.find((m) => m.id === id)?.name ?? "Member") : "Team");
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>
                {name(n.membershipId)} · {n.author} · {dateFmt.format(new Date(n.at))}
              </span>
              <button
                type="button"
                className="text-red-700 hover:underline"
                onClick={async () => {
                  if (!confirm("Delete this note?")) return;
                  await sendJson(`/api/notes/${n.id}`, "DELETE");
                  router.refresh();
                }}
              >
                Delete
              </button>
            </div>
            <p className="whitespace-pre-wrap">{n.body}</p>
          </li>
        ))}
        {notes.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
      </ul>
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(undefined);
          const r = await sendJson("/api/notes", "POST", about ? { membershipId: about, body } : { teamId, body });
          if (!r.ok) return setError(r.fields?.body?.[0] ?? r.error);
          setBody("");
          router.refresh();
        }}
      >
        <label className="text-sm">
          <span className="mr-2 text-slate-600">About</span>
          <Select value={about} onChange={(e) => setAbout(e.target.value)} className="w-auto">
            <option value="">The team</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Private note (never shown to students or demonstrators)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" disabled={!body.trim()}>
          Add note
        </Button>
      </form>
    </div>
  );
}
