"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return <p className="page-status">Checking administrator access…</p>;
  }
  if (!user) {
    return <p className="page-status">Redirecting to login…</p>;
  }
  if (!isAdmin) {
    return (
      <section className="card">
        <h1>Access restricted</h1>
        <p className="muted">This area is available to society administrators only.</p>
      </section>
    );
  }
  return <>{children}</>;
}

export function MemberGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return <p className="page-status">Checking membership…</p>;
  }
  if (!user) {
    return <p className="page-status">Redirecting to login…</p>;
  }
  return <>{children}</>;
}
