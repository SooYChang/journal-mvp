import { apiRequest } from "./client";
import type { ArticleSummary, GlobalArticleFilterOptions, JournalArticleDetail, PageResponse } from "./types";

export async function searchArticles(
  params: Record<string, string | number | boolean | undefined>,
): Promise<PageResponse<ArticleSummary>> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return apiRequest<PageResponse<ArticleSummary>>(`/api/articles?${search}`);
}

export async function globalArticleFilters(): Promise<GlobalArticleFilterOptions> {
  return apiRequest<GlobalArticleFilterOptions>("/api/articles/filter-options");
}

export async function getArticle(articleId: number): Promise<JournalArticleDetail> {
  return apiRequest<JournalArticleDetail>(`/api/articles/${articleId}`);
}
