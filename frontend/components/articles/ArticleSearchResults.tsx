"use client";

import type { ArticleSummary, PageResponse } from "@/lib/api/types";
import { ArticleResultCard } from "./ArticleResultCard";
import { Pagination } from "./Pagination";

export function ArticleSearchResults({
  page,
  loading,
  error,
  showJournal,
  onRetry,
  onPageChange,
}: {
  page: PageResponse<ArticleSummary> | null;
  loading: boolean;
  error: string | null;
  showJournal?: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}) {
  if (loading) {
    return (
      <div className="card">
        <p className="muted">Loading results…</p>
        <div className="article-card" style={{ marginTop: 12, minHeight: 96 }} />
        <div className="article-card" style={{ marginTop: 12, minHeight: 96 }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
        <button type="button" className="secondary-button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  if (!page || page.content.length === 0) {
    return (
      <div className="card">
        <p>No articles match the current search.</p>
        <button type="button" className="secondary-button" onClick={onRetry}>
          Reset filters
        </button>
      </div>
    );
  }

  const start = page.page * page.size + 1;
  const end = Math.min(page.totalElements, (page.page + 1) * page.size);

  return (
    <div>
      <p className="muted">
        {page.totalElements} results · showing {start}–{end}
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {page.content.map((article) => (
          <ArticleResultCard key={article.id} article={article} showJournal={showJournal} />
        ))}
      </div>
      <Pagination page={page.page} totalPages={page.totalPages} onChange={onPageChange} />
    </div>
  );
}
