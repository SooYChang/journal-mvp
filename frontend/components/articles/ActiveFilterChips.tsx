"use client";

export function ActiveFilterChips({
  chips,
  onClearOne,
  onClearAll,
}: {
  chips: { key: string; label: string }[];
  onClearOne: (key: string) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="chip-row" style={{ margin: "12px 0" }}>
      {chips.map((chip) => (
        <button key={chip.key} type="button" className="chip" onClick={() => onClearOne(chip.key)}>
          {chip.label}
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="text-button" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}
