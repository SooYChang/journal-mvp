import { apiRequest } from "./client";
import type { Annotation, AnnotationReply } from "./types";

export async function listAnnotations(journalId: string, articleId: number): Promise<Annotation[]> {
  return apiRequest<Annotation[]>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/${articleId}/annotations`,
  );
}

export async function createAnnotation(
  journalId: string,
  articleId: number,
  payload: { pageNumber: number; selectedText: string; positionData: string; body: string },
): Promise<Annotation> {
  return apiRequest<Annotation>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/${articleId}/annotations`,
    { method: "POST", json: payload },
  );
}

export async function patchAnnotation(
  journalId: string,
  articleId: number,
  annotationId: number,
  payload: { body?: string; status?: "OPEN" | "RESOLVED" },
): Promise<Annotation> {
  return apiRequest<Annotation>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/${articleId}/annotations/${annotationId}`,
    { method: "PATCH", json: payload },
  );
}

export async function deleteAnnotation(
  journalId: string,
  articleId: number,
  annotationId: number,
): Promise<void> {
  await apiRequest<{ status: string }>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/${articleId}/annotations/${annotationId}`,
    { method: "DELETE" },
  );
}

export async function replyToAnnotation(
  journalId: string,
  articleId: number,
  annotationId: number,
  body: string,
): Promise<AnnotationReply> {
  return apiRequest<AnnotationReply>(
    `/api/journals/${encodeURIComponent(journalId)}/articles/${articleId}/annotations/${annotationId}/replies`,
    { method: "POST", json: { body } },
  );
}
