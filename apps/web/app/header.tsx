"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-provider";
import { FontPicker } from "./font-provider";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header
      style={{
        borderBottom: "1px solid var(--rule)",
        padding: "0.9rem 1.25rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display), Fraunces, serif",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "1.3rem",
            textDecoration: "none",
          }}
        >
          Writer Platform
        </Link>
        {session?.user && (
          <nav style={{ display: "flex", gap: "1rem" }} className="eyebrow">
            <Link href="/">Feed</Link>
            <Link href="/documents">My Projects</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <FontPicker />
        <ThemeToggle />
      </div>
    </header>
  );
}
