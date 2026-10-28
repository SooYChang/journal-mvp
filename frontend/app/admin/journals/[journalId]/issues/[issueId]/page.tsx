"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { getAdminIssue, getJournal, publishIssue } from "@/lib/api/journals";
import type { IssueDetail, JournalDetail } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

function ReviewIssueForm() {
  const params = useParams<{ journalId: string; issueId: string }>();
  const router = useRouter();
  const issueId = Number(params.issueId);
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(() => {
    void getJournal(params.journalId)
      .then(setJournal)
      .catch(() => setJournal(null));
    void getAdminIssue(params.journalId, issueId)
      .then(setIssue)
      .catch((err) => setError(errorMessage(err, "Issue was not found.")));
  }, [params.journalId, issueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onPublish() {
    if (!issue) return;
    const missingPdf = issue.articles.filter((article) => !article.hasPdf).length;
    const warnings: string[] = [];
    if (issue.articles.length === 0) {
      warnings.push("This issue has no articles yet.");
    }
    if (missingPdf > 0) {
      warnings.push(`${missingPdf} article${missingPdf === 1 ? "" : "s"} ${missingPdf === 1 ? "has" : "have"} no PDF.`);
    }
    const confirmMessage =
      warnings.length > 0
        ? `${warnings.join(" ")}\n\nPublish Volume ${issue.volume}, Issue ${issue.issue} anyway? It will become visible on the public site.`
        : `Publish Volume ${issue.volume}, Issue ${issue.issue}? It will become visible on the public site.`;
    if (!window.confirm(confirmMessage)) return;
    setPublishing(true);
    setError(null);
    try {
      await publishIssue(params.journalId, issue.id);
      router.push(`/journals/${params.journalId}/issues/${issue.id}`);
    } catch (err) {
      setError(errorMessage(err, "Unable to publish this issue."));
      setPublishing(false);
    }
  }

  if (error && !issue) {
    return (
      <div>
        <AdminNav />
        <section className="card">
          <p className="error-text">{error}</p>
          <p>
            <Link href={`/journals/${params.journalId}`}>Back to journal</Link>
          </p>
        </section>
      </div>
    );
  }
  if (!issue) {
    return (
      <div>
        <AdminNav />
        <p className="muted">Loading issue…</p>
      </div>
    );
  }

  const isDraft = issue.status === "DRAFT";
  const missingPdf = issue.articles.filter((article) => !article.hasPdf).length;

  return (
    <div>
      <AdminNav />
      <nav className="breadcrumb">
        <Link href="/journals">Journals</Link>
        <span>/</span>
        <Link href={`/journals/${params.journalId}`}>{journal?.name ?? params.journalId}</Link>
        <span>/</span>
        <span>
          Vol. {issue.volume} · Issue {issue.issue}
        </span>
      </nav>
      <section className="card">
        <p className={isDraft ? "badge warn" : "badge"}>{isDraft ? "Draft" : "Published"}</p>
        <h1>
          Review Volume {issue.volume}, Issue {issue.issue}
        </h1>
        <p className="muted">Planned publication date {formatDate(issue.publishedAt)}</p>
        <p>{issue.description}</p>
        {isDraft ? (
          <p className="muted">
            This issue is not public. Check the contents below, then publish it to list it on the journal page.
          </p>
        ) : (
          <p className="muted">This issue is already public.</p>
        )}
        <div className="cta-row" style={{ marginTop: 16 }}>
          {isDraft ? (
            <button className="button" type="button" disabled={publishing} onClick={() => void onPublish()}>
              {publishing ? "Publishing…" : "Publish issue"}
            </button>
          ) : (
            <Link className="button" href={`/journals/${params.journalId}/issues/${issue.id}`}>
              View public issue
            </Link>
          )}
          <Link
            className="secondary-button"
            href={`/admin/journals/${params.journalId}/articles/new?issueId=${issue.id}`}
          >
            Upload article
          </Link>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Review checklist</h2>
        <ul>
          <li>
            {issue.articles.length === 0
              ? "No articles in this issue yet."
              : `${issue.articles.length} article${issue.articles.length === 1 ? "" : "s"} in contents order.`}
          </li>
          <li>
            {missingPdf === 0
              ? "Every listed article has a PDF."
              : `${missingPdf} article${missingPdf === 1 ? " is" : "s are"} missing a PDF.`}
          </li>
        </ul>
      </section>
      <section style={{ marginTop: 16 }}>
        <h2>Contents</h2>
        {issue.articles.length === 0 ? (
          <p className="muted">No articles have been uploaded to this issue yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {issue.articles.map((article) => (
              <article key={article.id} className="article-card">
                <p className="badge">{article.articleType}</p>
                <h3 className="article-title">
                  <Link href={`/journals/${params.journalId}/articles/${article.id}`}>{article.title}</Link>
                </h3>
                <p className="muted">
                  {article.authors.join(", ")}
                  {article.pages ? ` · pp. ${article.pages}` : ""}
                  {article.hasPdf ? "" : " · PDF not uploaded yet"}
                </p>
                <p style={{ marginTop: 8 }}>
                  <Link href={`/admin/journals/${params.journalId}/articles/${article.id}/edit`}>Edit article</Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ReviewIssuePage() {
  return (
    <AdminGuard>
      <ReviewIssueForm />
    </AdminGuard>
  );
}
