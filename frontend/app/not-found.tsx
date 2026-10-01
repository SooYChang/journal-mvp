import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card">
      <h1>Not found</h1>
      <p className="muted">The page you requested does not exist.</p>
      <Link href="/" className="button">
        Back to home
      </Link>
    </section>
  );
}
