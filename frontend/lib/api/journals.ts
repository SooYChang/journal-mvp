import { apiFileUrl, apiRequest } from "./client";
import type {
  ArticleSummary,
  IssueDetail,
  IssueSummary,
  JournalArticleDetail,
  JournalArticleFilterOptions,
  JournalDetail,
  JournalSummary,
  PageResponse,
} from "./types";

export async function listJournals(params: {
  query?: string;
  discipline?: string;
  sort?: string;
  size?: number;
}): Promise<JournalSummary[]> {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.discipline) search.set("discipline", params.discipline);
  if (params.sort) search.set("sort", params.sort);
  if (params.size) search.set("size", String(params.size));
  const suffix = search.toString() ? `?${search}` : "";
  return apiRequest<JournalSummary[]>(`/api/journals${suffix}`);
}

export async function listDisciplines(): Promise<string[]> {
  return apiRequest<string[]>("/api/journals/disciplines");
}

export async function getJournal(journalId: string): Promise<JournalDetail> {
  return apiRequest<JournalDetail>(`/api/journals/${encodeURIComponent(journalId)}`);
}

export function journalCoverUrl(coverUrl: string | null): string | null {
  return coverUrl ? apiFileUrl(coverUrl) : null;
}

export async function getIssue(journalId: string, issueId: number): Promise<IssueDetail> {
  return apiRequest<IssueDetail>(`/api/journals/${encodeURIComponent(journalId)}/issues/${issueId}`);
}

export async function listJournalArticles(
  journalId: string,
  params: Record<string, string | number | undefined>,
): Promise<PageResponse<ArticleSummary>> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return apiRequest<PageResponse<ArticleSummary>>(
    `/api/journals/${encodeURIComponent(journalId)}/articles?${search}`,
  );
}

export async function journalArticleFilters(journalId: string): Promise<JournalArticleFilterOptions> {
  return apiRequest<JournalArticleFilterOptions>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/filter-options`,
  );
}

export async function getJournalArticle(journalId: string, articleId: number): Promise<JournalArticleDetail> {
  return apiRequest<JournalArticleDetail>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/${articleId}`,
  );
}

export async function createJournal(form: FormData): Promise<JournalDetail> {
  return apiRequest<JournalDetail>("/api/admin/journals", { method: "POST", body: form });
}

export async function createIssue(
  journalId: string,
  payload: { volume: number; issue: number; publishedAt: string; description: string },
): Promise<IssueSummary> {
  return apiRequest<IssueSummary>(`/api/admin/journals/${encodeURIComponent(journalId)}/issues`, {
    method: "POST",
    json: payload,
  });
}

export async function getAdminIssue(journalId: string, issueId: number): Promise<IssueDetail> {
  return apiRequest<IssueDetail>(
    `/api/admin/journals/${encodeURIComponent(journalId)}/issues/${issueId}`,
  );
}

export async function publishIssue(journalId: string, issueId: number): Promise<IssueSummary> {
  return apiRequest<IssueSummary>(
    `/api/admin/journals/${encodeURIComponent(journalId)}/issues/${issueId}/publish`,
    { method: "POST" },
  );
}

export async function deleteJournal(journalId: string): Promise<void> {
  await apiRequest<{ status: string }>(`/api/admin/journals/${encodeURIComponent(journalId)}`, {
    method: "DELETE",
  });
}

export async function deleteArticle(journalId: string, articleId: number): Promise<void> {
  await apiRequest<{ status: string }>(
    `/api/admin/journals/${encodeURIComponent(journalId)}/articles/${articleId}`,
    { method: "DELETE" },
  );
}

export async function uploadArticle(journalId: string, form: FormData): Promise<JournalArticleDetail> {
  return apiRequest<JournalArticleDetail>(`/api/admin/journals/${encodeURIComponent(journalId)}/articles`, {
    method: "POST",
    body: form,
  });
}
