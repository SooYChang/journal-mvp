"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MemberGuard } from "@/components/auth/Guards";
import { AnnotationSidebar } from "@/components/pdf/AnnotationSidebar";
import { PdfPages, selectionToPosition, type PositionData } from "@/components/pdf/PdfPages";
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  patchAnnotation,
  replyToAnnotation,
} from "@/lib/api/annotations";
import { apiFileUrl } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { getJournalArticle } from "@/lib/api/journals";
import type { Annotation, JournalArticleDetail } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function Reader() {
  const params = useParams<{ journalId: string; articleId: string }>();
  const { canAnnotate } = useAuth();
  const [article, setArticle] = useState<JournalArticleDetail | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [pending, setPending] = useState<{ pageNumber: number; selectedText: string; positionData: string } | null>(
    null,
  );
  const [filter, setFilter] = useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const pdfUrl = apiFileUrl(`/api/journals/${params.journalId}/articles/${params.articleId}/pdf`);

  const refresh = useCallback(async () => {
    try {
      setAnnotations(await listAnnotations(params.journalId, Number(params.articleId)));
    } catch (err) {
      setError(errorMessage(err, "Unable to load annotations."));
    }
  }, [params.journalId, params.articleId]);

  useEffect(() => {
    void getJournalArticle(params.journalId, Number(params.articleId))
      .then(setArticle)
      .catch((err) => setPdfError(errorMessage(err, "Article was not found.")));
    void refresh();
  }, [params.journalId, params.articleId, refresh]);

  function captureSelection(container: HTMLElement) {
    if (!canAnnotate) return;
    const captured = selectionToPosition(container);
    if (!captured) return;
    setSelectedText(captured.text);
    setPending({
      pageNumber: captured.pageNumber,
      selectedText: captured.text,
      positionData: JSON.stringify(captured.position),
    });
  }

  async function onCreate(body: string) {
    if (!pending) return;
    setCreating(true);
    try {
      await createAnnotation(params.journalId, Number(params.articleId), { ...pending, body });
      setSelectedText("");
      setPending(null);
      window.getSelection()?.removeAllRanges();
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Unable to save the annotation."));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="pdf-toolbar">
        <Link href={`/journals/${params.journalId}/articles/${params.articleId}`}>Back to article</Link>
        <strong>{article?.title ?? "PDF reader"}</strong>
        <button type="button" className="secondary-button" aria-label="Zoom out" disabled={zoom <= 80} onClick={() => setZoom((z) => z - 20)}>
          −
        </button>
        <span>{zoom}%</span>
        <button type="button" className="secondary-button" aria-label="Zoom in" disabled={zoom >= 160} onClick={() => setZoom((z) => z + 20)}>
          +
        </button>
        <span className="muted">{pages ? `${pages} pages` : "Loading…"}</span>
        {canAnnotate && pending ? (
          <button type="button" className="button" onClick={() => document.getElementById("annotation-note")?.focus()}>
            Add annotation
          </button>
        ) : null}
      </div>
      {pdfError ? (
        <section className="card">
          <p className="error-text">{pdfError}</p>
          {isApiErrorMessage(pdfError) ? null : null}
          <Link href={`/journals/${params.journalId}/articles/${params.articleId}`}>Return to article</Link>
        </section>
      ) : (
        <div className="reader-shell">
          <div
            onMouseUp={(event) => captureSelection(event.currentTarget)}
            onKeyUp={(event) => captureSelection(event.currentTarget)}
          >
            <PdfPages
              url={pdfUrl}
              zoom={zoom}
              annotations={annotations}
              activeId={activeId}
              pending={pendingPosition(pending)}
              onReady={setPages}
              onError={(message) => setPdfError(normalizePdfError(message))}
            />
          </div>
          <AnnotationSidebar
            annotations={annotations}
            error={error}
            filter={filter}
            onFilter={setFilter}
            selectedText={selectedText}
            creating={creating}
            onSelect={(annotation) => {
              setActiveId(annotation.id);
              document.getElementById(`pdf-page-${annotation.pageNumber}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            onCreate={onCreate}
            onReply={async (id, body) => {
              await replyToAnnotation(params.journalId, Number(params.articleId), id, body);
              await refresh();
            }}
            onEdit={async (id, body) => {
              await patchAnnotation(params.journalId, Number(params.articleId), id, { body });
              await refresh();
            }}
            onDelete={async (id) => {
              const previous = annotations;
              setAnnotations((current) => current.filter((item) => item.id !== id));
              try {
                await deleteAnnotation(params.journalId, Number(params.articleId), id);
              } catch (err) {
                setAnnotations(previous);
                setError(errorMessage(err, "Unable to delete the annotation."));
              }
            }}
            onResolve={async (id, status) => {
              await patchAnnotation(params.journalId, Number(params.articleId), id, { status });
              await refresh();
            }}
            canAnnotate={canAnnotate}
          />
        </div>
      )}
    </div>
  );
}

function pendingPosition(
  pending: { pageNumber: number; selectedText: string; positionData: string } | null,
): PositionData | null {
  if (!pending) return null;
  try {
    return JSON.parse(pending.positionData) as PositionData;
  } catch {
    return null;
  }
}

function normalizePdfError(message: string): string {
  if (message.includes("401")) return "Please log in to read this PDF.";
  if (message.includes("403")) return "You do not have permission to read this PDF.";
  if (message.includes("404")) return "PDF not uploaded yet.";
  return message;
}

function isApiErrorMessage(message: string): boolean {
  return Boolean(message);
}

export default function ReadPage() {
  return (
    <MemberGuard>
      <Reader />
    </MemberGuard>
  );
}
