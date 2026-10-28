"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isApiError } from "@/lib/api/errors";

function loginErrorText(code: string | null): string | null {
  if (code === "invalid_credentials") {
    return "Invalid email or password.";
  }
  if (code === "account_inactive") {
    return "This account is not active.";
  }
  if (code === "account_deleted") {
    return "This account has been deleted.";
  }
  if (code) {
    return "Unable to log in.";
  }
  return null;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [errorText, setErrorText] = useState<string | null>(loginErrorText(params.get("error")));
  const [pending, setPending] = useState(false);
  const returnTo = params.get("returnTo") ?? "";
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/\\") ? returnTo : "/";
  const journalMatch = /^\/journals\/([^/?#]+)/.exec(safeReturnTo);
  const membershipHref = `/journals/${journalMatch?.[1] ?? "josier"}#membership`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorText(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      await login(email, password);
      router.replace(safeReturnTo);
    } catch (error) {
      if (isApiError(error)) {
        setErrorText(loginErrorText(error.code) ?? error.message);
      } else {
        setErrorText("Unable to log in.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1>Log in</h1>
      <p className="muted">
        New readers can{" "}
        <Link href={safeReturnTo === "/" ? "/join" : `/join?returnTo=${encodeURIComponent(safeReturnTo)}`}>
          register
        </Link>{" "}
        and read PDFs immediately.
      </p>
      <p className="muted">
        To write notes, see <Link href={membershipHref}>Membership</Link>.
      </p>
      <form onSubmit={(event) => void onSubmit(event)} className="form-grid">
        <label>
          Email
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        {errorText ? <p className="error-text">{errorText}</p> : null}
        <div className="form-actions">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="muted">Loading login…</p>}>
      <LoginForm />
    </Suspense>
  );
}
