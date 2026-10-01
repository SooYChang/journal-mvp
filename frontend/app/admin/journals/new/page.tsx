"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { createJournal } from "@/lib/api/journals";
import { errorMessage } from "@/lib/utils";

function NewJournalForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("cover");
    if (!(file instanceof File) || file.size === 0) {
      setError("A journal cover image is required.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover images must be 5MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Cover images must be JPEG, PNG, or WebP.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const journal = await createJournal(data);
      router.push(`/journals/${journal.id}`);
    } catch (err) {
      setError(errorMessage(err, "Unable to create the journal."));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminNav />
      <section className="card">
        <h1>Create journal</h1>
        <p className="muted">A cover image is required. Site cover copy in cover.json is separate and is not edited here.</p>
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Slug (optional)
            <input name="slug" />
          </label>
          <label>
            Discipline
            <input name="discipline" required />
          </label>
          <label>
            Description
            <textarea name="description" required />
          </label>
          <label>
            ISSN online
            <input name="issnOnline" required />
          </label>
          <label>
            Publisher
            <input name="publisher" required />
          </label>
          <label>
            Founded year
            <input name="foundedYear" type="number" />
          </label>
          <label>
            Frequency
            <input name="frequency" required />
          </label>
          <label>
            Aims and scope
            <textarea name="aimsAndScope" required />
          </label>
          <label>
            Editor-in-chief
            <input name="editorInChief" required />
          </label>
          <label>
            Cover image
            <input
              name="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
          {preview ? <img src={preview} alt="Cover preview" style={{ maxWidth: 180, borderRadius: 6 }} /> : null}
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create journal"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function NewJournalPage() {
  return (
    <AdminGuard>
      <NewJournalForm />
    </AdminGuard>
  );
}
