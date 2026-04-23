import Link from "next/link";
import { Nav } from "../components/nav";

export default function NotFoundPage() {
  return (
    <main className="shell">
      <Nav />
      <section className="hero">
        <div className="eyebrow">Not Found</div>
        <h1 className="headline">This record is not in the current MVP dataset.</h1>
        <p className="subtle">
          The typed routes are wired, but this ID is not currently available in the database-backed MVP set.
        </p>
        <Link href="/search" className="chip">
          Return to search
        </Link>
      </section>
    </main>
  );
}
