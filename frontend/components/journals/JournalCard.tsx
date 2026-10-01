import Link from "next/link";
import type { JournalSummary } from "@/lib/api/types";
import { JournalCover } from "./JournalCover";

export function JournalCard({ journal }: { journal: JournalSummary }) {
  return (
    <Link href={`/journals/${journal.id}`} className="card" style={{ display: "block", color: "inherit" }}>
      <JournalCover name={journal.name} coverUrl={journal.coverUrl} />
      <p className="badge">{journal.discipline}</p>
      <h2 className="article-title">{journal.name}</h2>
      <p className="muted">{journal.description}</p>
      <p className="muted">{journal.publisher}</p>
    </Link>
  );
}
