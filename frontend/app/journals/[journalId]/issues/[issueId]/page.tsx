"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getIssue, getJournal } from "@/lib/api/journals";
import type { IssueDetail, JournalDetail } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

export default function IssuePage() {
  const params = useParams<{ journalId: string; issueId: string }>();
  const { isAdmin } = useAuth();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getJournal(params.journalId).then(setJournal).catch(() => setJournal(null));
    void getIssue(params.journalId, Number(params.issueId))
      .then(setIssue)
      .catch((err) => setError(errorMessage(err, "Issue was not found.")));
  }, [params.journalId, params.issueId]);

  if (error) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }
  if (!issue) {
    return <p className="muted">Loading issue…</p>;
  }

  return (
    <div>
      <nav className="breadcrumb">
        <Link href={`/journals/${params.journalId}`}>{journal?.name ?? params.journalId}</Link>
        <span>/</span>
        <span>
          Vol. {issue.volume} · Issue {issue.issue}
        </span>
      </nav>
      <section className="card">
        {issue.status === "DRAFT" ? <p className="badge warn">Draft</p> : null}
        <h1>
          Volume {issue.volume}, Issue {issue.issue}
        </h1>
        <p className="muted">{formatDate(issue.publishedAt)}</p>
        <p>{issue.description}</p>
      </section>
      <section style={{ marginTop: 16 }}>
        <h2>Contents</h2>
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
              </p>
              {isAdmin ? (
                <p style={{ marginTop: 8 }}>
                  <Link href={`/admin/journals/${params.journalId}/articles/${article.id}/edit`}>Edit article</Link>
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
