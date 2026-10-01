"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActiveFilterChips } from "@/components/articles/ActiveFilterChips";
import { JournalCard } from "@/components/journals/JournalCard";
import { listDisciplines, listJournals } from "@/lib/api/journals";
import type { JournalSummary } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

export default function JournalsPage() {
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [journals, setJournals] = useState<JournalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listDisciplines()
      .then(setDisciplines)
      .catch(() => setDisciplines([]));
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true);
      void listJournals({ query, discipline, sort: "name" })
        .then((data) => {
          setJournals(data);
          setError(null);
        })
        .catch((err) => setError(errorMessage(err, "Unable to load journals.")))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, discipline]);

  const chips = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    if (query) items.push({ key: "query", label: `Search: ${query}` });
    if (discipline) items.push({ key: "discipline", label: discipline });
    return items;
  }, [query, discipline]);

  return (
    <div>
      <div className="cta-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Journals</h1>
          <p className="lede">Browse society journals by name or discipline.</p>
        </div>
        {isAdmin ? (
          <Link className="button" href="/admin/journals/new">
            Create journal
          </Link>
        ) : null}
      </div>
      <div className="card">
        <label>
          Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search journals" />
        </label>
        <label>
          Discipline
          <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Discipline">
            <option value="">All disciplines</option>
            {disciplines.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <ActiveFilterChips
          chips={chips}
          onClearOne={(key) => {
            if (key === "query") setQuery("");
            if (key === "discipline") setDiscipline("");
          }}
          onClearAll={() => {
            setQuery("");
            setDiscipline("");
          }}
        />
      </div>
      {loading ? <p className="muted">Loading journals…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !error && journals.length === 0 ? <p>No journals match the current filters.</p> : null}
      <div className="journal-grid" style={{ marginTop: 16 }}>
        {journals.map((journal) => (
          <JournalCard key={journal.id} journal={journal} />
        ))}
      </div>
    </div>
  );
}
