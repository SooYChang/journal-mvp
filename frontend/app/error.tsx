"use client";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="card">
      <h1>Something went wrong</h1>
      <p className="error-text">{error.message}</p>
      <button type="button" className="secondary-button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
