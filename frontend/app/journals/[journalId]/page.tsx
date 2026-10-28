"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { JournalCover } from "@/components/journals/JournalCover";
import { deleteJournal, getJournal, updateJournalProfile } from "@/lib/api/journals";
import type { JournalDetail, JournalProfileUpdate } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

type ProfileDraft = {
  name: string;
  description: string;
  issnOnline: string;
  publisher: string;
  foundedYear: string;
  frequency: string;
  aimsAndScope: string;
  editorInChief: string;
  editorialBoard: string;
  contactEmail: string;
  openAccessNote: string;
  publisherFullName: string;
  aboutPublisher: string;
  publisherCity: string;
  publisherContact: string;
  membershipNote: string;
  membershipEmail: string;
};

function draftFrom(journal: JournalDetail): ProfileDraft {
  return {
    name: journal.name,
    description: journal.description,
    issnOnline: journal.issnOnline === "N/A" ? "" : journal.issnOnline,
    publisher: journal.publisher,
    foundedYear: String(journal.foundedYear ?? ""),
    frequency: journal.frequency,
    aimsAndScope: journal.aimsAndScope,
    editorInChief: journal.editorInChief,
    editorialBoard: journal.editorialBoard ?? "",
    contactEmail: journal.contactEmail ?? "",
    openAccessNote: journal.openAccessNote ?? "",
    publisherFullName: journal.publisherFullName ?? "",
    aboutPublisher: journal.aboutPublisher ?? "",
    publisherCity: journal.publisherCity ?? "",
    publisherContact: journal.publisherContact ?? "",
    membershipNote: journal.membershipNote ?? "",
    membershipEmail: journal.membershipEmail ?? "",
  };
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ContactLine({ label, value }: { label: string; value: string | null }) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <p>
      <span className="section-label">{label}</span>{" "}
      {isEmail(text) ? <a href={`mailto:${encodeURIComponent(text)}`}>{text}</a> : text}
    </p>
  );
}

export default function JournalDetailPage() {
  const params = useParams<{ journalId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [journal, setJournal] = useState<JournalDetail | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getJournal(params.journalId)
      .then((next) => {
        setJournal(next);
        setDraft(draftFrom(next));
      })
      .catch((err) => setError(errorMessage(err, "Journal was not found.")));
  }, [params.journalId]);

  function updateDraft(key: keyof ProfileDraft, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!journal || !draft) return;
    const foundedYear = Number(draft.foundedYear);
    if (!Number.isInteger(foundedYear)) {
      setError("Founded year must be a whole number.");
      return;
    }
    const profile: JournalProfileUpdate = {
      name: draft.name,
      description: draft.description,
      issnOnline: draft.issnOnline,
      publisher: draft.publisher,
      foundedYear,
      frequency: draft.frequency,
      aimsAndScope: draft.aimsAndScope,
      editorInChief: draft.editorInChief,
      editorialBoard: draft.editorialBoard,
      contactEmail: draft.contactEmail,
      openAccessNote: draft.openAccessNote,
      publisherFullName: draft.publisherFullName,
      aboutPublisher: draft.aboutPublisher,
      publisherCity: draft.publisherCity,
      publisherContact: draft.publisherContact,
      membershipNote: draft.membershipNote,
      membershipEmail: draft.membershipEmail,
    };
    setSaving(true);
    setError(null);
    try {
      const next = await updateJournalProfile(journal.id, profile);
      setJournal(next);
      setDraft(draftFrom(next));
    } catch (err) {
      setError(errorMessage(err, "Unable to save the journal information."));
    } finally {
      setSaving(false);
    }
  }

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
  if (!journal || !draft) {
    return <p className="muted">Loading journal…</p>;
  }

  const showPublisher = Boolean(
    journal.publisherFullName || journal.aboutPublisher || journal.publisherCity || journal.publisherContact,
  );

  return (
    <div>
      <section className="card">
        <div className="article-layout">
          <JournalCover name={journal.name} coverUrl={journal.coverUrl} />
          <div>
            <h1 className="visually-hidden">{journal.name}</h1>
            <p className="cover-lead">{journal.description}</p>
            <dl className="cover-facts">
              <div>
                <dt>e-ISSN</dt>
                <dd>{journal.issnOnline}</dd>
              </div>
              <div>
                <dt>published by</dt>
                <dd>{journal.publisher}</dd>
              </div>
              <div>
                <dt>Founded</dt>
                <dd>{journal.foundedYear}</dd>
              </div>
              <div>
                <dd>{journal.frequency}</dd>
              </div>
              <div>
                <dt>Editor-in-chief</dt>
                <dd>{journal.editorInChief}</dd>
              </div>
              {journal.contactEmail?.trim() ? (
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {isEmail(journal.contactEmail.trim()) ? (
                      <a href={`mailto:${encodeURIComponent(journal.contactEmail.trim())}`}>
                        {journal.contactEmail.trim()}
                      </a>
                    ) : (
                      journal.contactEmail.trim()
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
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
      <section className="card about-block" style={{ marginTop: 16 }}>
        <h2>About the journal</h2>
        <details className="fold">
          <summary>Guidelines for authors</summary>
          <p className="prose-block">{journal.aimsAndScope}</p>
        </details>
        {journal.editorialBoard ? (
          <>
            <h3>Editorial board</h3>
            <p className="prose-block">{journal.editorialBoard}</p>
          </>
        ) : null}
        {journal.openAccessNote ? (
          <>
            <h3>Open access</h3>
            <p className="prose-block">{journal.openAccessNote}</p>
          </>
        ) : null}
      </section>
      {showPublisher ? (
        <section className="card about-block" style={{ marginTop: 16 }}>
          <h2>About the publisher</h2>
          {journal.publisherFullName ? <p className="prose-block">{journal.publisherFullName}</p> : null}
          {journal.publisherCity ? <p className="muted">{journal.publisherCity}</p> : null}
          {journal.aboutPublisher ? <p className="prose-block">{journal.aboutPublisher}</p> : null}
          <ContactLine label="Contact" value={journal.publisherContact} />
        </section>
      ) : null}
      {journal.membershipNote || journal.membershipEmail ? (
        <section id="membership" className="card about-block" style={{ marginTop: 16 }}>
          <h2>Membership</h2>
          {journal.membershipNote ? <p className="prose-block">{journal.membershipNote}</p> : null}
          <p style={{ marginTop: 16 }}>
            <Link className="button" href="/join">
              Register as a Reader
            </Link>
          </p>
          <ContactLine label="Request Annotator membership" value={journal.membershipEmail} />
        </section>
      ) : null}
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
      {isAdmin ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Edit journal information</h2>
          <p className="muted">Saved text appears on this page for every reader.</p>
          <form className="form-grid" onSubmit={(event) => void onSave(event)}>
            <label>
              Name
              <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
            </label>
            <label>
              Description
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                required
              />
            </label>
            <label>
              e-ISSN
              <input
                value={draft.issnOnline}
                placeholder="3091-8960"
                onChange={(event) => updateDraft("issnOnline", event.target.value)}
                required
              />
            </label>
            <label>
              Founded year
              <input
                value={draft.foundedYear}
                type="number"
                onChange={(event) => updateDraft("foundedYear", event.target.value)}
                required
              />
            </label>
            <label>
              Frequency
              <input
                value={draft.frequency}
                onChange={(event) => updateDraft("frequency", event.target.value)}
                required
              />
            </label>
            <label>
              Editor-in-chief
              <input
                value={draft.editorInChief}
                onChange={(event) => updateDraft("editorInChief", event.target.value)}
                required
              />
            </label>
            <label>
              Editorial board
              <textarea
                value={draft.editorialBoard}
                placeholder="One name on each line"
                onChange={(event) => updateDraft("editorialBoard", event.target.value)}
              />
            </label>
            <label>
              Journal contact email
              <input
                value={draft.contactEmail}
                type="email"
                onChange={(event) => updateDraft("contactEmail", event.target.value)}
              />
            </label>
            <label>
              Open-access note
              <textarea
                value={draft.openAccessNote}
                onChange={(event) => updateDraft("openAccessNote", event.target.value)}
              />
            </label>
            <label>
              Guidelines for authors
              <textarea
                value={draft.aimsAndScope}
                onChange={(event) => updateDraft("aimsAndScope", event.target.value)}
                required
              />
            </label>
            <h3>Publisher</h3>
            <label>
              Short name
              <input
                value={draft.publisher}
                onChange={(event) => updateDraft("publisher", event.target.value)}
                required
              />
            </label>
            <label>
              Full name
              <input
                value={draft.publisherFullName}
                onChange={(event) => updateDraft("publisherFullName", event.target.value)}
              />
            </label>
            <label>
              City
              <input
                value={draft.publisherCity}
                onChange={(event) => updateDraft("publisherCity", event.target.value)}
              />
            </label>
            <label>
              About the publisher
              <textarea
                value={draft.aboutPublisher}
                onChange={(event) => updateDraft("aboutPublisher", event.target.value)}
              />
            </label>
            <label>
              Publisher contact
              <input
                value={draft.publisherContact}
                onChange={(event) => updateDraft("publisherContact", event.target.value)}
              />
            </label>
            <h3>Membership</h3>
            <label>
              Instructions
              <textarea
                value={draft.membershipNote}
                onChange={(event) => updateDraft("membershipNote", event.target.value)}
              />
            </label>
            <label>
              Application email
              <input
                type="email"
                value={draft.membershipEmail}
                onChange={(event) => updateDraft("membershipEmail", event.target.value)}
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save journal information"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
