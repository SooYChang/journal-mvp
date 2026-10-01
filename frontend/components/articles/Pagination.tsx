"use client";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const displayPage = page + 1;
  return (
    <div className="cta-row" style={{ marginTop: 16 }}>
      <button type="button" className="secondary-button" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {displayPage} of {Math.max(totalPages, 1)}
      </span>
      <button
        type="button"
        className="secondary-button"
        disabled={displayPage >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
