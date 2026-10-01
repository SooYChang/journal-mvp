"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { deleteMember, getMember, updateMember } from "@/lib/api/members";
import type { AccountStatus, Member, UserRole } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function MemberDetailInner() {
  const params = useParams<{ userId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(search.get("created") === "1" ? "Member registered." : null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getMember(Number(params.userId))
      .then(setMember)
      .catch((err) => setError(errorMessage(err, "Member was not found.")));
  }, [params.userId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMember(member.id, {
        displayName: String(form.get("displayName")),
        role: String(form.get("role")) as UserRole,
        status: String(form.get("status")) as AccountStatus,
      });
      setMember(updated);
      setSuccess("Member saved.");
    } catch (err) {
      setError(errorMessage(err, "Unable to save this member."));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!member) return;
    if (!window.confirm("Delete this member? The account will no longer appear in the list or be able to log in.")) {
      return;
    }
    try {
      await deleteMember(member.id);
      router.push("/admin/members");
    } catch (err) {
      setError(errorMessage(err, "Unable to delete this member."));
    }
  }

  if (error && !member) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }
  if (!member) return <p className="muted">Loading member…</p>;

  return (
    <div>
      <AdminNav />
      <section className="card">
        <h1>Manage member</h1>
        {success ? <p className="success-text">{success}</p> : null}
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Email
            <input value={member.email} readOnly />
          </label>
          <label>
            Display name
            <input name="displayName" defaultValue={member.displayName} required maxLength={120} />
          </label>
          <label>
            Role
            <select name="role" defaultValue={member.role}>
              <option value="MEMBER">MEMBER</option>
              <option value="SOCIETY_ADMIN">SOCIETY_ADMIN</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={member.status}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="DEACTIVATED">DEACTIVATED</option>
            </select>
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <Link className="secondary-button" href="/admin/members">
              Back
            </Link>
            <button type="button" className="danger-button" onClick={() => void onDelete()}>
              Delete member
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<p className="muted">Loading member…</p>}>
        <MemberDetailInner />
      </Suspense>
    </AdminGuard>
  );
}
