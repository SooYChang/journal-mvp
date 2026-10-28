"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Annotation } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

export function AnnotationSidebar({
  annotations,
  error,
  filter,
  onFilter,
  onSelect,
  onCreate,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  selectedText,
  creating,
  canAnnotate,
}: {
  annotations: Annotation[];
  error: string | null;
  filter: "OPEN" | "RESOLVED" | "ALL";
  onFilter: (value: "OPEN" | "RESOLVED" | "ALL") => void;
  onSelect: (annotation: Annotation) => void;
  onCreate: (body: string) => Promise<void>;
  onReply: (id: number, body: string) => Promise<void>;
  onEdit: (id: number, body: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onResolve: (id: number, status: "OPEN" | "RESOLVED") => Promise<void>;
  selectedText: string;
  creating: boolean;
  canAnnotate: boolean;
}) {
  const [body, setBody] = useState("");
  const visible = useMemo(
    () => annotations.filter((item) => (filter === "ALL" ? true : item.status === filter)),
    [annotations, filter],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    await onCreate(body.trim());
    setBody("");
  }

  return (
    <aside className="card">
      <h2>Annotations</h2>
      <label>
        Status
        <select value={filter} onChange={(event) => onFilter(event.target.value as "OPEN" | "RESOLVED" | "ALL")}>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ALL">All</option>
        </select>
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      {canAnnotate && selectedText ? (
        <form onSubmit={(event) => void submit(event)} className="form-grid">
          <p className="serif">{selectedText}</p>
          <label>
            Note
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} required />
          </label>
          <button className="button" type="submit" disabled={creating}>
            {creating ? "Saving…" : "Add annotation"}
          </button>
        </form>
      ) : canAnnotate ? (
        <p className="muted">Select PDF text to add an annotation.</p>
      ) : (
        <p className="muted">You can read annotations. Writing notes requires an annotator account.</p>
      )}
      {visible.length === 0 ? <p className="muted">No annotations in this view.</p> : null}
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {visible.map((annotation) => (
          <AnnotationCard
            key={annotation.id}
            annotation={annotation}
            onSelect={() => onSelect(annotation)}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onResolve={onResolve}
            canAnnotate={canAnnotate}
          />
        ))}
      </div>
    </aside>
  );
}

function AnnotationCard({
  annotation,
  onSelect,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  canAnnotate,
}: {
  annotation: Annotation;
  onSelect: () => void;
  onReply: (id: number, body: string) => Promise<void>;
  onEdit: (id: number, body: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onResolve: (id: number, status: "OPEN" | "RESOLVED") => Promise<void>;
  canAnnotate: boolean;
}) {
  const [reply, setReply] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(annotation.body);

  return (
    <article className="article-card">
      <button type="button" className="text-button" onClick={onSelect} aria-label={`Go to annotation on page ${annotation.pageNumber}`}>
        Page {annotation.pageNumber} · {annotation.author.displayName} · {formatDate(annotation.createdAt)}
      </button>
      <p className="serif">{annotation.selectedText}</p>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onEdit(annotation.id, editBody).then(() => setEditing(false));
          }}
        >
          <textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} />
          <button className="button" type="submit">
            Save
          </button>
        </form>
      ) : (
        <p>{annotation.body}</p>
      )}
      <p className="badge">{annotation.status}</p>
      <div className="cta-row">
        {annotation.canEdit ? (
          <button type="button" className="text-button" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : null}
        {annotation.canEdit || annotation.canResolve ? (
          <button type="button" className="text-button" onClick={() => void onDelete(annotation.id)}>
            Delete
          </button>
        ) : null}
        {annotation.canResolve ? (
          <button
            type="button"
            className="text-button"
            onClick={() => void onResolve(annotation.id, annotation.status === "OPEN" ? "RESOLVED" : "OPEN")}
          >
            {annotation.status === "OPEN" ? "Resolve" : "Reopen"}
          </button>
        ) : null}
      </div>
      {annotation.replies.map((item) => (
        <p key={item.id} className="muted">
          {item.author.displayName}: {item.body}
        </p>
      ))}
      {canAnnotate ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!reply.trim()) return;
            void onReply(annotation.id, reply.trim()).then(() => setReply(""));
          }}
        >
          <label>
            Reply
            <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={3000} />
          </label>
        </form>
      ) : null}
    </article>
  );
}
