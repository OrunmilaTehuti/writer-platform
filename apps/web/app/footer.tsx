import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--rule)",
        marginTop: "3rem",
        padding: "1.5rem 1.25rem",
        textAlign: "center",
      }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>
        Scribes Meet · a page for writers, in every form
      </p>
      <p className="eyebrow" style={{ margin: "0.5rem 0 0", display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
      </p>
    </footer>
  );
}
