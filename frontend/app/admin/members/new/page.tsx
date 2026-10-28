"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth/Guards";
import { AdminNav } from "@/components/layout/AdminNav";
import { createMember } from "@/lib/api/members";
import { ROLE_OPTIONS, type UserRole } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils";

function NewMemberForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("temporaryPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const member = await createMember({
        email: String(form.get("email")),
        displayName: String(form.get("displayName")),
        temporaryPassword: password,
        role: String(form.get("role")) as UserRole,
      });
      router.push(`/admin/members/${member.id}?created=1`);
    } catch (err) {
      setError(errorMessage(err, "Unable to register this member."));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminNav />
      <section className="card">
        <h1>Register member</h1>
        <p className="muted">Password must be at least 10 characters and include a letter, a number, and a symbol.</p>
        <form className="form-grid" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Display name
            <input name="displayName" required maxLength={120} />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Temporary password
            <input name="temporaryPassword" type="password" required minLength={10} />
          </label>
          <label>
            Confirm password
            <input name="confirmPassword" type="password" required minLength={10} />
          </label>
          <label>
            Role
            <select name="role" defaultValue="READER">
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register member"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function NewMemberPage() {
  return (
    <AdminGuard>
      <NewMemberForm />
    </AdminGuard>
  );
}
