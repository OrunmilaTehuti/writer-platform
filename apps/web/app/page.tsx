import Link from "next/link";
import { auth, signOut } from "@/auth";
import Feed from "./feed";
import NotificationBell from "./notification-bell";

export default async function Home() {
  const session = await auth();

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "sans-serif", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Writer Platform</h1>
        {session?.user && <NotificationBell />}
      </div>

      {session?.user ? (
        <div style={{ marginBottom: "1.5rem" }}>
          <p>
            Signed in as {session.user.name} ({session.user.email}) ·{" "}
            <Link href="/editor/demo-doc">Editor demo</Link>
          </p>
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

      {session?.user ? (
        <Feed />
      ) : (
        <p style={{ color: "#666" }}>Log in to see your feed and follow other writers.</p>
      )}
    </main>
  );
}
