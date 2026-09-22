"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { addCustomerNote, deleteCustomerNote } from "@/lib/actions/admin/customers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerNote } from "@/lib/supabase/types";

export function CustomerNotes({
  customerId,
  notes: initialNotes,
}: {
  customerId: string;
  notes: CustomerNote[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        const created = await addCustomerNote(customerId, body);
        setNotes((prev) => [created, ...prev]);
        setBody("");
        formRef.current?.reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add note");
      }
    });
  }

  function removeNote(noteId: string) {
    setDeletingId(noteId);
    startTransition(async () => {
      try {
        await deleteCustomerNote(noteId, customerId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete note");
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} onSubmit={addNote} className="flex flex-col gap-2">
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note — call summary, preference, follow-up reminder…"
        />
        <Button type="submit" size="sm" className="self-end" loading={pending} loadingText="Adding…" disabled={!body.trim()}>
          Add note
        </Button>
      </form>

      {notes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeNote(note.id)}
                disabled={deletingId === note.id}
                aria-label="Delete note"
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}
    </div>
  );
}
