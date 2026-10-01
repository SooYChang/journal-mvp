import Link from "next/link";
import type { ArticleSummary } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

export function ArticleResultCard({
  article,
  showJournal = true,
}: {
  article: ArticleSummary;
  showJournal?: boolean;
}) {
  return (
    <article className="article-card">
      <p className="badge">{article.articleType}</p>
      <h2 className="article-title">
        <Link href={`/journals/${article.journalId}/articles/${article.id}`}>{article.title}</Link>
      </h2>
      <p className="muted">{article.authors.join(", ")}</p>
      {showJournal ? (
        <p>
          <Link href={`/journals/${article.journalId}`}>{article.journalName}</Link>
        </p>
      ) : null}
      <p className="muted">
        Vol. {article.volume} · Issue {article.issue} · {formatDate(article.publishedAt)}
        {article.pages ? ` · pp. ${article.pages}` : ""}
      </p>
      <p className="serif">{article.abstractPreview}</p>
      <p className="muted" style={{ overflowWrap: "anywhere" }}>
        {article.doi ? `DOI ${article.doi}` : "No DOI"} · {article.citations} citations
      </p>
      <div className="chip-row">
        {article.keywords.map((keyword) => (
          <span key={keyword} className="chip">
            {keyword}
          </span>
        ))}
        {article.openAccess ? <span className="badge">Open access</span> : null}
        <span className={article.hasPdf ? "badge" : "badge warn"}>
          {article.hasPdf ? "PDF available" : "PDF unavailable"}
        </span>
      </div>
      <p style={{ marginTop: 12 }}>
        <Link href={`/journals/${article.journalId}/articles/${article.id}`}>View article</Link>
      </p>
    </article>
  );
}
