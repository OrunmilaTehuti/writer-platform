import Link from "next/link";
import { auth, signOut } from "@/auth";
import Feed from "./feed";
import NotificationBell from "./notification-bell";

export default async function Home() {
  const session = await auth();

  return (
    <main className="manuscript" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      {session?.user ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.75rem",
          }}
        >
          <p className="eyebrow" style={{ margin: 0 }}>
            Signed in as {session.user.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <NotificationBell />
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button type="submit">Log out</button>
            </form>
          </div>
        </div>
      ) : (
        <div style={{ padding: "3rem 0" }}>
          <h1>A page for writers, in every form.</h1>
          <p style={{ color: "var(--ink-soft)", maxWidth: 480 }}>
            Draft screenplays, blog posts, and academic writing with proper formatting built in,
            and share your work with other writers as you go.
          </p>
          <p>
            <Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link> to get started.
          </p>
        </div>
      )}

      {session?.user ? (
        <Feed />
      ) : null}
    </main>
  );
}
