import Link from "next/link";

// Placeholder feed - swap in real posts from @writer-platform/db once
// auth is wired up. Kept unstyled on purpose: visual design is a
// separate pass (see README "Next steps").
export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", fontFamily: "sans-serif" }}>
      <h1>Writer Platform</h1>
      <p>Feed of posts from writers you follow will render here.</p>
      <p>
        Try the collaborative editor demo:{" "}
        <Link href="/editor/demo-doc">/editor/demo-doc</Link>
      </p>
    </main>
  );
}
