"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isApiError } from "@/lib/api/errors";
import { errorMessage, isSafeReturnTo } from "@/lib/utils";

function LoginForm() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const returnTo = params.get("returnTo");
      router.replace(isSafeReturnTo(returnTo) ? returnTo : "/");
    } catch (err) {
      if (isApiError(err) && err.code === "account_inactive") {
        setError("This account is not active.");
      } else if (isApiError(err) && err.code === "account_deleted") {
        setError("This account has been deleted.");
      } else {
        setError(errorMessage(err, "Invalid email or password."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1>Log in</h1>
      <p className="muted">Use a society account. Public signup is not available.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="form-grid">
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Log in"}
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
