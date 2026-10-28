"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { getJournal, getJournalArticle, updateArticle } from "@/lib/api/journals";
import type { JournalArticleDetail, JournalDetail } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function EditArticleForm() {
  const params = useParams<{ journalId: string; articleId: string }>();
  const articleId = Number(params.articleId);
  const router = useRouter();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [article, setArticle] = useState<JournalArticleDetail | null>(null);
  const [issueId, setIssueId] = useState("");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pages, setPages] = useState("");
  const [doi, setDoi] = useState("");
  const [articleType, setArticleType] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [citations, setCitations] = useState("0");
  const [openAccess, setOpenAccess] = useState("true");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileLabel, setFileLabel] = useState("Keep the current PDF");

  useEffect(() => {
    void getJournal(params.journalId)
      .then(setJournal)
      .catch((err) => setError(errorMessage(err, "Journal was not found.")));
    void getJournalArticle(params.journalId, articleId)
      .then((next) => {
        setArticle(next);
        setIssueId(String(next.issueId));
        setTitle(next.title);
        setAuthors(next.authors.join(", "));
        setAbstractText(next.abstractText);
        setKeywords(next.keywords.join(", "));
        setPages(next.pages ?? "");
        setDoi(next.doi ?? "");
        setArticleType(next.articleType);
        setPublishedAt(next.publishedAt.slice(0, 10));
        setCitations(String(next.citations));
        setOpenAccess(next.openAccess ? "true" : "false");
        setFileLabel(next.pdfOriginalFilename ? `Current file: ${next.pdfOriginalFilename}` : "No PDF uploaded yet");
      })
      .catch((err) => setError(errorMessage(err, "Article was not found.")));
  }, [params.journalId, articleId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const pdf = form.get("pdf");
    if (pdf instanceof File && pdf.size > 0) {
      if (pdf.size > 25 * 1024 * 1024) {
        setError("PDF files must be 25MB or smaller.");
        return;
      }
      if (pdf.type && pdf.type !== "application/pdf") {
        setError("The file must be a PDF.");
        return;
      }
    } else {
      form.delete("pdf");
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateArticle(params.journalId, articleId, form);
      router.push(`/journals/${params.journalId}/articles/${articleId}`);
    } catch (err) {
      setError(errorMessage(err, "Unable to save the article."));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminNav />
      <section className="card">
        <h1>Edit article</h1>
        <p>
          Journal: <Link href={`/journals/${params.journalId}`}>{journal?.name ?? params.journalId}</Link>
        </p>
        {!article || !journal ? (
          error ? <p className="error-text">{error}</p> : <p className="muted">Loading article…</p>
        ) : (
          <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
            <label>
              Issue
              <select name="issueId" required value={issueId} onChange={(event) => setIssueId(event.target.value)}>
                {(journal.issues ?? []).map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    Vol. {issue.volume} · Issue {issue.issue}
                    {issue.status === "DRAFT" ? " (draft)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Authors (comma-separated)
              <input name="authors" required value={authors} onChange={(event) => setAuthors(event.target.value)} />
            </label>
            <label>
              Abstract
              <textarea
                name="abstractText"
                required
                value={abstractText}
                onChange={(event) => setAbstractText(event.target.value)}
              />
            </label>
            <label>
              Keywords (comma-separated)
              <input name="keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} />
            </label>
            <label>
              Pages
              <input name="pages" placeholder="1-18" value={pages} onChange={(event) => setPages(event.target.value)} />
            </label>
            <label>
              DOI
              <input
                name="doi"
                placeholder="10.23375/JOSIER.1.1.56594"
                value={doi}
                onChange={(event) => setDoi(event.target.value)}
              />
            </label>
            <label>
              Article type
              <input
                name="articleType"
                required
                value={articleType}
                onChange={(event) => setArticleType(event.target.value)}
              />
            </label>
            <label>
              Published date
              <input
                name="publishedAt"
                type="date"
                required
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </label>
            <label>
              Citations
              <input
                name="citations"
                type="number"
                value={citations}
                onChange={(event) => setCitations(event.target.value)}
              />
            </label>
            <label>
              Open access
              <select name="openAccess" value={openAccess} onChange={(event) => setOpenAccess(event.target.value)}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label>
              Replacement PDF
              <input
                name="pdf"
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setFileLabel(
                    file
                      ? `${file.name} (${Math.round(file.size / 1024)} KB)`
                      : article.pdfOriginalFilename
                        ? `Current file: ${article.pdfOriginalFilename}`
                        : "No PDF uploaded yet",
                  );
                }}
              />
            </label>
            <p className="muted">{fileLabel}. Leave this empty to keep the current PDF.</p>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="cta-row">
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </button>
              <Link className="secondary-button" href={`/journals/${params.journalId}/articles/${articleId}`}>
                Cancel
              </Link>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default function EditArticlePage() {
  return (
    <AdminGuard>
      <EditArticleForm />
    </AdminGuard>
  );
}
