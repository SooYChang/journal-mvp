"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { Pagination } from "@/components/articles/Pagination";
import { listMembers } from "@/lib/api/members";
import type { Member, PageResponse } from "@/lib/api/types";
import { errorMessage, formatDate } from "@/lib/utils";

function MembersTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<Member> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true);
      void listMembers({ query, status, page, size: 20 })
        .then((result) => {
          setData(result);
          setError(null);
        })
        .catch((err) => setError(errorMessage(err, "Unable to load members.")))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, status, page]);

  return (
    <div>
      <AdminNav />
      <div className="cta-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Members</h1>
          <p className="lede">Register accounts directly. There is no public signup.</p>
        </div>
        <Link className="button" href="/admin/members/new">
          Register member
        </Link>
      </div>
      <div className="card">
        <label>
          Search
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} aria-label="Search members" />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} aria-label="Status">
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="DEACTIVATED">DEACTIVATED</option>
          </select>
        </label>
      </div>
      {loading ? <p className="muted">Loading members…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && data && data.content.length === 0 ? <p>No members match the current filters.</p> : null}
      {data && data.content.length > 0 ? (
        <>
          <div className="table-wrap desktop-table card" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((member) => (
                  <tr key={member.id}>
                    <td>{member.displayName}</td>
                    <td style={{ overflowWrap: "anywhere" }}>{member.email}</td>
                    <td>{member.role}</td>
                    <td>{member.status}</td>
                    <td>{formatDate(member.createdAt)}</td>
                    <td>
                      <Link href={`/admin/members/${member.id}`}>Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="stacked-card">
            {data.content.map((member) => (
              <article key={member.id} className="article-card">
                <strong>{member.displayName}</strong>
                <p className="muted" style={{ overflowWrap: "anywhere" }}>
                  {member.email}
                </p>
                <p>
                  {member.role} · {member.status}
                </p>
                <Link href={`/admin/members/${member.id}`}>Manage</Link>
              </article>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

export default function MembersPage() {
  return (
    <AdminGuard>
      <MembersTable />
    </AdminGuard>
  );
}
