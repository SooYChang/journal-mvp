"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActiveFilterChips } from "@/components/articles/ActiveFilterChips";
import { ArticleFilters } from "@/components/articles/ArticleFilters";
import { ArticleSearchResults } from "@/components/articles/ArticleSearchResults";
import { getJournal, journalArticleFilters, listJournalArticles } from "@/lib/api/journals";
import type { ArticleSummary, JournalArticleFilterOptions, JournalDetail, PageResponse } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function BrowseInner() {
  const params = useParams<{ journalId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [filters, setFilters] = useState<JournalArticleFilterOptions | null>(null);
  const [page, setPage] = useState<PageResponse<ArticleSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState(searchParams.get("query") ?? "");

  const state = useMemo(
    () => ({
      query: searchParams.get("query") ?? "",
      year: searchParams.get("year") ?? "",
      volume: searchParams.get("volume") ?? "",
      issue: searchParams.get("issue") ?? "",
      articleType: searchParams.get("articleType") ?? "",
      sort: searchParams.get("sort") ?? "newest",
      page: Math.max(Number(searchParams.get("page") ?? "1") - 1, 0),
    }),
    [searchParams],
  );

  function href(next: Record<string, string>, resetPage = true) {
    const search = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) search.set(key, value);
      else search.delete(key);
    });
    if (resetPage) search.set("page", "1");
    return `/journals/${params.journalId}/articles?${search.toString()}`;
  }

  useEffect(() => {
    void getJournal(params.journalId).then(setJournal).catch(() => setJournal(null));
    void journalArticleFilters(params.journalId).then(setFilters).catch(() => setFilters(null));
  }, [params.journalId]);

  useEffect(() => {
    setQueryInput(state.query);
  }, [state.query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (queryInput !== state.query) {
        router.replace(href({ query: queryInput }));
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    setLoading(true);
    void listJournalArticles(params.journalId, {
      query: state.query || undefined,
      year: state.year || undefined,
      volume: state.volume || undefined,
      issue: state.issue || undefined,
      articleType: state.articleType || undefined,
      sort: state.sort,
      page: state.page,
      size: 10,
    })
      .then((data) => {
        setPage(data);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err, "Unable to load articles.")))
      .finally(() => setLoading(false));
  }, [params.journalId, state]);

  const chips = [
    state.query ? { key: "query", label: `Search: ${state.query}` } : null,
    state.year ? { key: "year", label: state.year } : null,
    state.volume ? { key: "volume", label: `Vol. ${state.volume}` } : null,
    state.issue ? { key: "issue", label: `Issue ${state.issue}` } : null,
    state.articleType ? { key: "articleType", label: state.articleType } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div>
      <nav className="breadcrumb">
        <Link href="/journals">Journals</Link>
        <span>/</span>
        <Link href={`/journals/${params.journalId}`}>{journal?.name ?? params.journalId}</Link>
        <span>/</span>
        <span>Articles</span>
      </nav>
      <div className="cta-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Browse articles</h1>
          <p className="lede">Search within this journal only.</p>
        </div>
        {isAdmin ? (
          <Link className="button" href={`/admin/journals/${params.journalId}/articles/new`}>
            Upload article PDF
          </Link>
        ) : null}
      </div>
      <div className="article-layout">
        <ArticleFilters
          query={queryInput}
          onQuery={setQueryInput}
          fields={[
            {
              name: "year",
              label: "Year",
              value: state.year,
              options: (filters?.years ?? []).map((item) => ({ value: String(item), label: String(item) })),
              onChange: (value) => router.replace(href({ year: value })),
            },
            {
              name: "volume",
              label: "Volume",
              value: state.volume,
              options: (filters?.volumes ?? []).map((item) => ({ value: String(item), label: String(item) })),
              onChange: (value) => router.replace(href({ volume: value })),
            },
            {
              name: "issue",
              label: "Issue",
              value: state.issue,
              options: (filters?.issues ?? []).map((item) => ({ value: String(item), label: String(item) })),
              onChange: (value) => router.replace(href({ issue: value })),
            },
            {
              name: "articleType",
              label: "Article type",
              value: state.articleType,
              options: (filters?.articleTypes ?? []).map((item) => ({ value: item, label: item })),
              onChange: (value) => router.replace(href({ articleType: value })),
            },
          ]}
        />
        <div>
          <label>
            Sort
            <select
              value={state.sort}
              onChange={(event) => router.replace(href({ sort: event.target.value }))}
              aria-label="Sort articles"
            >
              <option value="newest">Newest</option>
              <option value="relevance">Relevance</option>
              <option value="citations">Citations</option>
              <option value="title">Title</option>
            </select>
          </label>
          <ActiveFilterChips
            chips={chips}
            onClearOne={(key) => {
              if (key === "query") setQueryInput("");
              router.replace(href({ [key]: "" }));
            }}
            onClearAll={() => {
              setQueryInput("");
              router.replace(`/journals/${params.journalId}/articles`);
            }}
          />
          <ArticleSearchResults
            page={page}
            loading={loading}
            error={error}
            showJournal={false}
            onRetry={() => router.replace(`/journals/${params.journalId}/articles`)}
            onPageChange={(nextPage) => router.replace(href({ page: String(nextPage + 1) }, false))}
          />
        </div>
      </div>
    </div>
  );
}

export default function JournalArticlesPage() {
  return (
    <Suspense fallback={<p className="muted">Loading articles…</p>}>
      <BrowseInner />
    </Suspense>
  );
}
