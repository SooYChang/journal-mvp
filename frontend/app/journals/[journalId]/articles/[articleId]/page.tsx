"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { deleteArticle, getJournalArticle } from "@/lib/api/journals";
import type { JournalArticleDetail } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

export default function ArticleDetailPage() {
  const params = useParams<{ journalId: string; articleId: string }>();
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [article, setArticle] = useState<JournalArticleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getJournalArticle(params.journalId, Number(params.articleId))
      .then(setArticle)
      .catch((err) => setError(errorMessage(err, "Article was not found.")));
  }, [params.journalId, params.articleId]);

  async function onDelete() {
    if (!window.confirm("Delete this article? It will disappear from public lists.")) return;
    try {
      await deleteArticle(params.journalId, Number(params.articleId));
      router.push(`/journals/${params.journalId}/articles`);
    } catch (err) {
      setError(errorMessage(err, "Unable to delete this article."));
    }
  }

  if (error && !article) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }
  if (!article) {
    return <p className="muted">Loading article…</p>;
  }

  return (
    <div>
      <nav className="breadcrumb">
        <Link href="/journals">Journals</Link>
        <span>/</span>
        <Link href={`/journals/${article.journalId}`}>{article.journalName}</Link>
        <span>/</span>
        <span>{article.title}</span>
      </nav>
      <section className="card">
        <p className="badge">{article.articleType}</p>
        <h1>{article.title}</h1>
        <p>{article.authors.join(", ")}</p>
        <p className="muted">
          {article.journalName} · Vol. {article.volume} Issue {article.issue} · {formatDate(article.publishedAt)}
          {article.pages ? ` · pp. ${article.pages}` : ""}
        </p>
        <p className="muted" style={{ overflowWrap: "anywhere" }}>
          {article.doi ? `DOI ${article.doi}` : "No DOI"} · {article.citations} citations
        </p>
        <div className="chip-row">
          {article.keywords.map((keyword) => (
            <span key={keyword} className="chip">
              {keyword}
            </span>
          ))}
        </div>
        {article.hasPdf ? (
          isAuthenticated ? (
            <p style={{ marginTop: 16 }}>
              <Link className="button" href={`/journals/${article.journalId}/articles/${article.id}/read`}>
                Read PDF & annotations
              </Link>
            </p>
          ) : (
            <p style={{ marginTop: 16 }}>
              <Link href={`/login?returnTo=${encodeURIComponent(`/journals/${article.journalId}/articles/${article.id}/read`)}`}>
                Log in to read the PDF and annotations
              </Link>
            </p>
          )
        ) : (
          <p className="muted">PDF not uploaded yet</p>
        )}
        {isAdmin ? (
          <p style={{ marginTop: 16 }}>
            <button type="button" className="danger-button" onClick={() => void onDelete()}>
              Delete article
            </button>
          </p>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Abstract</h2>
        <p className="serif">{article.abstractText}</p>
      </section>
    </div>
  );
}
