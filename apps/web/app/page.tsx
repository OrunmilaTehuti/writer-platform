import Link from "next/link";
import { auth, signOut } from "@/auth";

// Placeholder feed - swap in real posts from @writer-platform/db once
// the social feed UI is built. Kept unstyled on purpose: visual design
// is a separate pass (see README "Next steps").
export default async function Home() {
  const session = await auth();

  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", fontFamily: "sans-serif" }}>
      <h1>Writer Platform</h1>

      {session?.user ? (
        <div>
          <p>Signed in as {session.user.name} ({session.user.email})</p>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button type="submit">Log out</button>
          </form>
        </div>
      ) : (
        <p>
          <Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link> to get started.
        </p>
      )}

      <p>Feed of posts from writers you follow will render here.</p>
      <p>
        Try the collaborative editor demo:{" "}
        <Link href="/editor/demo-doc">/editor/demo-doc</Link>
      </p>
    </main>
  );
}
