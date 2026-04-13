import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/">Overview</Link>
      <Link href="/search">Search</Link>
      <Link href="/recommendations">Recommendations</Link>
    </nav>
  );
}
