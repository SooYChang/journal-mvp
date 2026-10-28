"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { deleteArticle, downloadJournalPdf, getJournal, getJournalArticle } from "@/lib/api/journals";
import { doiHref } from "@/lib/doi";
import type { JournalArticleDetail } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

export default function ArticleDetailPage() {
  const params = useParams<{ journalId: string; articleId: string }>();
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [article, setArticle] = useState<JournalArticleDetail | null>(null);
  const [membershipHref, setMembershipHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void getJournalArticle(params.journalId, Number(params.articleId))
      .then(setArticle)
      .catch((err) => setError(errorMessage(err, "Article was not found.")));
  }, [params.journalId, params.articleId]);

  useEffect(() => {
    void getJournal(params.journalId)
      .then((journal) => {
        setMembershipHref(
          journal.membershipEmail || journal.membershipNote ? `/journals/${journal.id}#membership` : null,
        );
      })
      .catch(() => setMembershipHref(null));
  }, [params.journalId]);

  async function onDownload() {
    if (!article) return;
    setDownloading(true);
    setError(null);
    try {
      const fallback = `${article.title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "article"}.pdf`;
      await downloadJournalPdf(article.journalId, article.id, fallback);
    } catch (err) {
      setError(errorMessage(err, "Unable to download the PDF."));
    } finally {
      setDownloading(false);
    }
  }

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
          {article.doi ? (
            <>
              DOI{" "}
              <a href={doiHref(article.doi)} target="_blank" rel="noreferrer">
                {article.doi}
              </a>
            </>
          ) : (
            "No DOI"
          )}{" "}
          · {article.citations} citations
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
            <div className="cta-row" style={{ marginTop: 16 }}>
              <Link className="button" href={`/journals/${article.journalId}/articles/${article.id}/read`}>
                Read PDF & annotations
              </Link>
              <button type="button" className="secondary-button" disabled={downloading} onClick={() => void onDownload()}>
                {downloading ? "Downloading…" : "Download PDF"}
              </button>
            </div>
          ) : (
            <>
              <div className="cta-row" style={{ marginTop: 16 }}>
                <Link
                  className="button"
                  href={`/join?returnTo=${encodeURIComponent(`/journals/${article.journalId}/articles/${article.id}/read`)}`}
                >
                  Register to read the PDF
                </Link>
                <Link
                  className="secondary-button"
                  href={`/login?returnTo=${encodeURIComponent(`/journals/${article.journalId}/articles/${article.id}/read`)}`}
                >
                  Log in
                </Link>
              </div>
              {membershipHref ? (
                <p className="muted">
                  To write notes, request Annotator membership. See <Link href={membershipHref}>Membership</Link>.
                </p>
              ) : null}
            </>
          )
        ) : (
          <p className="muted">PDF not uploaded yet</p>
        )}
        {isAdmin ? (
          <div className="cta-row" style={{ marginTop: 16 }}>
            <Link className="secondary-button" href={`/admin/journals/${article.journalId}/articles/${article.id}/edit`}>
              Edit article
            </Link>
            <button type="button" className="danger-button" onClick={() => void onDelete()}>
              Delete article
            </button>
          </div>
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
