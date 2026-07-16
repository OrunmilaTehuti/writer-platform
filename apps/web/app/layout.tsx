import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Writer Platform",
  description: "Write, format, and share screenplays, blog posts, and academic writing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
