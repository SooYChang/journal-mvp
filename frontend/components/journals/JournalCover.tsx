"use client";

import { useState } from "react";
import { journalCoverUrl } from "@/lib/api/journals";

export function JournalCover({
  name,
  coverUrl,
}: {
  name: string;
  coverUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = journalCoverUrl(coverUrl);
  const initial = name.trim().slice(0, 1).toUpperCase() || "J";

  if (!src || failed) {
    return (
      <div className="journal-cover" aria-hidden="true">
        {initial}
      </div>
    );
  }

  return (
    <div className="journal-cover">
      <img src={src} alt="" onError={() => setFailed(true)} />
    </div>
  );
}
