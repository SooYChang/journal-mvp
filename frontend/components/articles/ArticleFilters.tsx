"use client";

type FilterOption = { value: string; label: string };

export function ArticleFilters({
  query,
  onQuery,
  fields,
}: {
  query: string;
  onQuery: (value: string) => void;
  fields: {
    name: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
}) {
  return (
    <aside className="filter-panel card">
      <label>
        Search
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Title, author, keyword"
          aria-label="Search articles"
        />
      </label>
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          <select value={field.value} onChange={(event) => field.onChange(event.target.value)} aria-label={field.label}>
            <option value="">All</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </aside>
  );
}
