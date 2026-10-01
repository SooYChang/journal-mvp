"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { JournalCover } from "@/components/journals/JournalCover";
import { deleteJournal, getJournal } from "@/lib/api/journals";
import type { JournalDetail } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

export default function JournalDetailPage() {
  const params = useParams<{ journalId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void getJournal(params.journalId)
      .then(setJournal)
      .catch((err) => setError(errorMessage(err, "Journal was not found.")));
  }, [params.journalId]);

  async function onDelete() {
    if (!window.confirm("Delete this journal? It will disappear from public lists.")) return;
    setDeleting(true);
    try {
      await deleteJournal(params.journalId);
      router.push("/journals");
    } catch (err) {
      setError(errorMessage(err, "Unable to delete this journal."));
      setDeleting(false);
    }
  }

  if (error && !journal) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }
  if (!journal) {
    return <p className="muted">Loading journal…</p>;
  }

  return (
    <div>
      <nav className="breadcrumb">
        <Link href="/journals">Journals</Link>
        <span>/</span>
        <span>{journal.name}</span>
      </nav>
      <section className="card">
        <div className="article-layout">
          <JournalCover name={journal.name} coverUrl={journal.coverUrl} />
          <div>
            <p className="badge">{journal.discipline}</p>
            <h1>{journal.name}</h1>
            <p>{journal.description}</p>
            <p className="muted">
              ISSN {journal.issnOnline} · {journal.publisher} · Founded {journal.foundedYear} · {journal.frequency}
            </p>
            <p className="muted">Editor-in-chief {journal.editorInChief}</p>
            <div className="cta-row" style={{ marginTop: 16 }}>
              <Link className="button" href={`/journals/${journal.id}/articles`}>
                Browse articles
              </Link>
              {isAdmin ? (
                <>
                  <Link className="secondary-button" href={`/admin/journals/${journal.id}/issues/new`}>
                    Add issue
                  </Link>
                  <Link className="secondary-button" href={`/admin/journals/${journal.id}/articles/new`}>
                    Upload article
                  </Link>
                  <button type="button" className="danger-button" disabled={deleting} onClick={() => void onDelete()}>
                    Delete journal
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Aims & scope</h2>
        <p className="serif">{journal.aimsAndScope}</p>
      </section>
      <section style={{ marginTop: 16 }}>
        <h2>Issues</h2>
        {journal.issues.length === 0 ? <p>No issues have been created yet.</p> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {journal.issues.map((issue) => {
            const isDraft = issue.status === "DRAFT";
            const href = isDraft
              ? `/admin/journals/${journal.id}/issues/${issue.id}`
              : `/journals/${journal.id}/issues/${issue.id}`;
            return (
              <Link key={issue.id} href={href} className="article-card">
                {isDraft ? <p className="badge warn">Draft</p> : null}
                Volume {issue.volume}, Issue {issue.issue} · {formatDate(issue.publishedAt)}
                <p className="muted">{issue.description}</p>
                {isDraft && isAdmin ? <p className="muted">Review and publish</p> : null}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
