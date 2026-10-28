"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { getJournal, uploadArticle } from "@/lib/api/journals";
import type { JournalDetail } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function NewArticleForm() {
  const params = useParams<{ journalId: string }>();
  const searchParams = useSearchParams();
  const preselectedIssueId = searchParams.get("issueId") ?? undefined;
  const router = useRouter();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [issueId, setIssueId] = useState(preselectedIssueId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileLabel, setFileLabel] = useState("No file selected");

  useEffect(() => {
    void getJournal(params.journalId)
      .then((next) => {
        setJournal(next);
        const preferred = preselectedIssueId && next.issues.some((issue) => String(issue.id) === preselectedIssueId)
          ? preselectedIssueId
          : next.issues[0]
            ? String(next.issues[0].id)
            : "";
        setIssueId(preferred);
      })
      .catch((err) => setError(errorMessage(err, "Journal was not found.")));
  }, [params.journalId, preselectedIssueId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const pdf = form.get("pdf");
    if (!(pdf instanceof File) || pdf.size === 0) {
      setError("A PDF file is required.");
      return;
    }
    if (pdf.size > 25 * 1024 * 1024) {
      setError("PDF files must be 25MB or smaller.");
      return;
    }
    if (pdf.type && pdf.type !== "application/pdf") {
      setError("The file must be a PDF.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const article = await uploadArticle(params.journalId, form);
      const selectedIssueId = Number(form.get("issueId"));
      const selectedIssue = journal?.issues.find((issue) => issue.id === selectedIssueId);
      if (selectedIssue?.status === "DRAFT") {
        router.push(`/admin/journals/${params.journalId}/issues/${selectedIssue.id}`);
      } else {
        router.push(`/journals/${params.journalId}/articles/${article.id}`);
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to upload the article."));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminNav />
      <section className="card">
        <h1>Upload article</h1>
        <p>
          Journal: <Link href={`/journals/${params.journalId}`}>{journal?.name ?? params.journalId}</Link>
        </p>
        {!journal ? <p className="muted">Loading journal…</p> : null}
        {journal && journal.issues.length === 0 ? (
          <p>
            Create issue first. <Link href={`/admin/journals/${params.journalId}/issues/new`}>Create issue</Link>
          </p>
        ) : null}
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Issue
            <select
              name="issueId"
              required
              disabled={!journal || journal.issues.length === 0}
              value={issueId}
              onChange={(event) => setIssueId(event.target.value)}
            >
              {(journal?.issues ?? []).map((issue) => (
                <option key={issue.id} value={issue.id}>
                  Vol. {issue.volume} · Issue {issue.issue}
                  {issue.status === "DRAFT" ? " (draft)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Authors (comma-separated)
            <input name="authors" placeholder="Hana Kim, David Chen" required />
          </label>
          <label>
            Abstract
            <textarea name="abstractText" required />
          </label>
          <label>
            Keywords (comma-separated)
            <input name="keywords" />
          </label>
          <label>
            Pages
            <input name="pages" placeholder="1-18" />
          </label>
          <label>
            DOI
            <input name="doi" placeholder="10.23375/JOSIER.1.1.56594" />
          </label>
          <label>
            Article type
            <input name="articleType" required />
          </label>
          <label>
            Published date
            <input name="publishedAt" type="date" required />
          </label>
          <label>
            Citations
            <input name="citations" type="number" defaultValue={0} />
          </label>
          <label>
            Open access
            <select name="openAccess" defaultValue="true">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            PDF
            <input
              name="pdf"
              type="file"
              accept="application/pdf"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                setFileLabel(file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "No file selected");
              }}
            />
          </label>
          <p className="muted">{fileLabel}</p>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button" type="submit" disabled={submitting || !journal || journal.issues.length === 0}>
            {submitting ? "Uploading…" : "Upload article"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function NewArticlePage() {
  return (
    <AdminGuard>
      <NewArticleForm />
    </AdminGuard>
  );
}
