"use client";

import { useRouter } from "next/navigation";
import type { FormType } from "@/generated/prisma/enums";
import type { CommentRow } from "@/lib/server/forms/comments";
import { Alert, Button, sendJson, useSubmit } from "@/components/ui/form";

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

export function CommentsPanel({
  teamId,
  form,
  membershipId,
  comments,
  canComment,
}: {
  teamId: string;
  form: FormType;
  membershipId: string | null;
  comments: CommentRow[];
  canComment: boolean;
}) {
  const router = useRouter();
  const { pending, error, run } = useSubmit();

  async function onSubmit(formData: FormData) {
    const r = await run(() => sendJson(`/api/teams/${teamId}/comments`, "POST", { formType: form, membershipId, body: formData.get("body") }));
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="mb-1 text-xs text-slate-500">
              {c.authorName} ({c.authorRole === "LECTURER" ? "Lecturer" : c.authorRole === "DEMONSTRATOR" ? "Demonstrator" : "Student"}) ·{" "}
              {dateFmt.format(new Date(c.createdAt))}
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
      {canComment && (
        <form action={onSubmit} className="space-y-2">
          {error && <Alert>{error}</Alert>}
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Feedback for the student / team"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </form>
      )}
    </div>
  );
}
