"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { createIssue, getJournal } from "@/lib/api/journals";
import type { JournalDetail } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function NewIssueForm() {
  const params = useParams<{ journalId: string }>();
  const router = useRouter();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getJournal(params.journalId)
      .then(setJournal)
      .catch((err) => setError(errorMessage(err, "Journal was not found.")));
  }, [params.journalId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const issue = await createIssue(params.journalId, {
        volume: Number(form.get("volume")),
        issue: Number(form.get("issue")),
        publishedAt: String(form.get("publishedAt")),
        description: String(form.get("description")),
      });
      router.push(`/admin/journals/${params.journalId}/issues/${issue.id}`);
    } catch (err) {
      setError(errorMessage(err, "Unable to create the issue."));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminNav />
      <section className="card">
        <h1>Create issue</h1>
        <p className="muted">The issue is saved as a draft. Review the contents, then publish it to make it public.</p>
        <p>
          <Link href={`/journals/${params.journalId}`}>{journal?.name ?? params.journalId}</Link>
        </p>
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Volume
            <input name="volume" type="number" min={1} required />
          </label>
          <label>
            Issue
            <input name="issue" type="number" min={1} required />
          </label>
          <label>
            Planned publication date
            <input name="publishedAt" type="date" required />
          </label>
          <label>
            Description
            <textarea name="description" required />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save draft"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function NewIssuePage() {
  return (
    <AdminGuard>
      <NewIssueForm />
    </AdminGuard>
  );
}
