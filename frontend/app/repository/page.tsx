"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ActiveFilterChips } from "@/components/articles/ActiveFilterChips";
import { ArticleFilters } from "@/components/articles/ArticleFilters";
import { ArticleSearchResults } from "@/components/articles/ArticleSearchResults";
import { globalArticleFilters, searchArticles } from "@/lib/api/articles";
import type { ArticleSummary, GlobalArticleFilterOptions, PageResponse } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function normalizeSort(value: string | null): string {
  return ["relevance", "newest", "citations", "title"].includes(value ?? "") ? value! : "newest";
}

function RepositoryInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [filters, setFilters] = useState<GlobalArticleFilterOptions | null>(null);
  const [page, setPage] = useState<PageResponse<ArticleSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState(params.get("query") ?? "");

  const state = useMemo(
    () => ({
      query: params.get("query") ?? "",
      journalId: params.get("journalId") ?? "",
      discipline: params.get("discipline") ?? "",
      year: params.get("year") ?? "",
      articleType: params.get("articleType") ?? "",
      openAccess: params.get("openAccess") ?? "",
      hasPdf: params.get("hasPdf") ?? "",
      sort: normalizeSort(params.get("sort")),
      page: Math.max(Number(params.get("page") ?? "1") - 1, 0),
    }),
    [params],
  );

  function update(next: Record<string, string>, resetPage = true) {
    const search = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) search.set(key, value);
      else search.delete(key);
    });
    if (resetPage) search.set("page", "1");
    router.replace(`/repository?${search.toString()}`);
  }

  useEffect(() => {
    setQueryInput(state.query);
  }, [state.query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (queryInput !== state.query) {
        update({ query: queryInput });
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    void globalArticleFilters()
      .then(setFilters)
      .catch(() => setFilters(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    void searchArticles({
      query: state.query || undefined,
      journalId: state.journalId || undefined,
      discipline: state.discipline || undefined,
      year: state.year ? Number(state.year) : undefined,
      articleType: state.articleType || undefined,
      openAccess: state.openAccess === "" ? undefined : state.openAccess === "true",
      hasPdf: state.hasPdf === "" ? undefined : state.hasPdf === "true",
      sort: state.sort,
      page: state.page,
      size: 10,
    })
      .then((data) => {
        setPage(data);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err, "Unable to search articles.")))
      .finally(() => setLoading(false));
  }, [state]);

  const chips = [
    state.query ? { key: "query", label: `Search: ${state.query}` } : null,
    state.journalId ? { key: "journalId", label: filters?.journals.find((j) => j.id === state.journalId)?.name ?? state.journalId } : null,
    state.discipline ? { key: "discipline", label: state.discipline } : null,
    state.year ? { key: "year", label: state.year } : null,
    state.articleType ? { key: "articleType", label: state.articleType } : null,
    state.openAccess ? { key: "openAccess", label: state.openAccess === "true" ? "Open access" : "Closed" } : null,
    state.hasPdf ? { key: "hasPdf", label: state.hasPdf === "true" ? "PDF available" : "PDF unavailable" } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="wide-wrap" style={{ width: "100%" }}>
      <h1 className="page-title">Browse Repository</h1>
      <p className="lede">Search articles across all journals.</p>
      <div className="article-layout">
        <ArticleFilters
          query={queryInput}
          onQuery={setQueryInput}
          fields={[
            {
              name: "journalId",
              label: "Journal",
              value: state.journalId,
              options: (filters?.journals ?? []).map((item) => ({ value: item.id, label: item.name })),
              onChange: (value) => update({ journalId: value }),
            },
            {
              name: "discipline",
              label: "Discipline",
              value: state.discipline,
              options: (filters?.disciplines ?? []).map((item) => ({ value: item, label: item })),
              onChange: (value) => update({ discipline: value }),
            },
            {
              name: "year",
              label: "Year",
              value: state.year,
              options: (filters?.years ?? []).map((item) => ({ value: String(item), label: String(item) })),
              onChange: (value) => update({ year: value }),
            },
            {
              name: "articleType",
              label: "Article type",
              value: state.articleType,
              options: (filters?.articleTypes ?? []).map((item) => ({ value: item, label: item })),
              onChange: (value) => update({ articleType: value }),
            },
            {
              name: "openAccess",
              label: "Open access",
              value: state.openAccess,
              options: [
                { value: "true", label: "Open access" },
                { value: "false", label: "Not open access" },
              ],
              onChange: (value) => update({ openAccess: value }),
            },
            {
              name: "hasPdf",
              label: "PDF availability",
              value: state.hasPdf,
              options: [
                { value: "true", label: "PDF available" },
                { value: "false", label: "PDF unavailable" },
              ],
              onChange: (value) => update({ hasPdf: value }),
            },
          ]}
        />
        <div>
          <label>
            Sort
            <select value={state.sort} onChange={(event) => update({ sort: event.target.value })} aria-label="Sort articles">
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
              update({ [key]: "" });
            }}
            onClearAll={() => {
              setQueryInput("");
              router.replace("/repository");
            }}
          />
          <ArticleSearchResults
            page={page}
            loading={loading}
            error={error}
            showJournal
            onRetry={() => {
              setQueryInput("");
              router.replace("/repository");
            }}
            onPageChange={(nextPage) => {
              const search = new URLSearchParams(params.toString());
              search.set("page", String(nextPage + 1));
              router.replace(`/repository?${search.toString()}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function RepositoryPage() {
  return (
    <Suspense fallback={<p className="muted">Loading repository…</p>}>
      <RepositoryInner />
    </Suspense>
  );
}
