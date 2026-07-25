import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, IBM_Plex_Mono, Playfair_Display, Inter, Courier_Prime } from "next/font/google";
import { Providers } from "./providers";
import { ThemeProvider } from "./theme-provider";
import { FontProvider } from "./font-provider";
import Header from "./header";
import Footer from "./footer";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500", "600"], style: ["normal", "italic"] });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", weight: ["400", "600"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-plex-mono", weight: ["400", "500"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["500", "600"], style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "600"] });
const courierPrime = Courier_Prime({ subsets: ["latin"], variable: "--font-courier-prime", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Writer Platform",
  description: "Write, format, and share screenplays, blog posts, and academic writing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} ${plexMono.variable} ${playfair.variable} ${inter.variable} ${courierPrime.variable}`}
    >
      <body>
        <Providers>
          <ThemeProvider>
            <FontProvider>
              <Header />
              {children}
              <Footer />
            </FontProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
