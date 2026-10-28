"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { JournalCard } from "@/components/journals/JournalCard";
import { searchArticles } from "@/lib/api/articles";
import { listJournals } from "@/lib/api/journals";
import type { ArticleSummary, JournalSummary, SiteCoverCopy } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

const FALLBACK_COVER: SiteCoverCopy = {
  title: "Journal of Applied Systems",
  subtitle: "Peer-reviewed research for society members.",
};

export default function HomePage() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [cover, setCover] = useState<SiteCoverCopy>(FALLBACK_COVER);
  const [journals, setJournals] = useState<JournalSummary[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/site/cover.json", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as SiteCoverCopy;
          if (!cancelled && data.title && data.subtitle) {
            setCover({ title: data.title, subtitle: data.subtitle });
          }
        }
      } catch {
        if (!cancelled) setCover(FALLBACK_COVER);
      }
      try {
        const data = await listJournals({ sort: "newest", size: 3 });
        if (!cancelled) setJournals(data);
      } catch (error) {
        if (!cancelled) setJournalError(errorMessage(error, "Unable to load recent journals."));
      }
      try {
        const data = await searchArticles({ sort: "newest", size: 3 });
        if (!cancelled) setArticles(data.content);
      } catch (error) {
        if (!cancelled) setArticleError(errorMessage(error, "Unable to load recent articles."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <section className="hero">
        <h1>{cover.title}</h1>
        <p>{cover.subtitle}</p>
        <div className="cta-row">
          <Link className="button" href="/repository">
            Browse Repository
          </Link>
          <Link className="secondary-button" href="/journals">
            Browse journals
          </Link>
          {!isAuthenticated ? (
            <Link className="secondary-button" href="/login">
              Member login
            </Link>
          ) : isAdmin ? (
            <Link className="secondary-button" href="/admin/journals/new">
              Manage journals
            </Link>
          ) : (
            <Link className="secondary-button" href="/repository">
              Continue browsing
            </Link>
          )}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 className="page-title">Recent journals</h2>
        {loading ? <p className="muted">Loading journals…</p> : null}
        {journalError ? <p className="error-text">{journalError}</p> : null}
        {!loading && !journalError && journals.length === 0 ? <p>No journals are available yet.</p> : null}
        <div className="journal-grid">
          {journals.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 32 }}>
        <h2>For members</h2>
        <p className="muted">
          Signed-in readers can open PDFs and read annotations. Annotators can also leave notes. Public visitors can
          browse metadata, abstracts, and the global repository.
        </p>
        {user ? <p className="success-text">Signed in as {user.displayName}.</p> : null}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 className="page-title">Recent articles</h2>
        {articleError ? <p className="error-text">{articleError}</p> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {articles.map((article) => (
            <article key={article.id} className="article-card">
              <p className="badge">{article.articleType}</p>
              <h3 className="article-title">
                <Link href={`/journals/${article.journalId}/articles/${article.id}`}>{article.title}</Link>
              </h3>
              <p className="muted">
                {article.journalName} · {formatDate(article.publishedAt)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
