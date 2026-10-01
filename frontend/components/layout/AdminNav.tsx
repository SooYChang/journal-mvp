"use client";

import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="admin-subnav" aria-label="Administrator">
      <Link href="/admin/members">Members</Link>
      <Link href="/admin/journals/new">New journal</Link>
    </nav>
  );
}
