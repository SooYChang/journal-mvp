"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { errorMessage } from "@/lib/utils";

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { registerReader, isAuthenticated } = useAuth();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const returnTo = params.get("returnTo") ?? "";
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/\\") ? returnTo : "/";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (password !== confirm) {
      setErrorText("Passwords do not match.");
      return;
    }
    setPending(true);
    setErrorText(null);
    try {
      await registerReader({
        email: String(form.get("email") ?? ""),
        displayName: String(form.get("displayName") ?? ""),
        affiliation: String(form.get("affiliation") ?? ""),
        password,
      });
      router.replace(safeReturnTo);
    } catch (error) {
      setErrorText(errorMessage(error, "Unable to register."));
      setPending(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1>Register as a Reader</h1>
      <p className="muted">
        A Reader account can open PDFs immediately. Writing notes requires Annotator membership, which is granted
        separately.
      </p>
      <p className="muted">Password must be at least 10 characters and include a letter, a number, and a symbol.</p>
      {isAuthenticated ? <p className="muted">You are already signed in. Registering here replaces that session.</p> : null}
      <form onSubmit={(event) => void onSubmit(event)} className="form-grid">
        <label>
          Name
          <input name="displayName" autoComplete="name" required maxLength={120} />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Affiliation
          <input name="affiliation" required maxLength={255} />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </label>
        <label>
          Confirm password
          <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} />
        </label>
        {errorText ? <p className="error-text">{errorText}</p> : null}
        <div className="form-actions">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Registering…" : "Register"}
          </button>
          <Link className="secondary-button" href={safeReturnTo === "/" ? "/login" : `/login?returnTo=${encodeURIComponent(safeReturnTo)}`}>
            Log in
          </Link>
        </div>
      </form>
    </section>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="muted">Loading registration…</p>}>
      <JoinForm />
    </Suspense>
  );
}
